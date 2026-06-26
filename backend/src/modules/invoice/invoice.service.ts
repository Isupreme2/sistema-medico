import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';
import { Appointment, AppointmentStatus } from '../../models/appointment.model';
import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import { calcularTotales } from '../../utils/billing';
import { CreateInvoiceInput } from './invoice.validation';
import { notify } from '../notification/notification.service';
import { NotificationType } from '../../models/notification.model';

/** Tarifa de una consulta (S/). La fija el servidor, nunca el cliente. */
const TARIFA_CONSULTA = 80;

function generarNumero(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `FAC-${year}-${rand}`;
}

/** Emite una factura. El médico factura sus consultas; el admin puede facturar a cualquiera. */
export async function crear(creator: AccessTokenPayload, input: CreateInvoiceInput) {
  let pacienteId: string;
  let medicoId: string | undefined;

  if (input.citaId) {
    const cita = await Appointment.findById(input.citaId);
    if (!cita) throw AppError.notFound('Cita no encontrada');

    const esGestor =
      creator.role === UserRole.ADMIN || creator.role === UserRole.RECEPCIONISTA;
    const esMedicoDeCita =
      creator.role === UserRole.MEDICO && cita.medicoId.toString() === creator.sub;
    if (!esGestor && !esMedicoDeCita) {
      throw AppError.forbidden('No puedes facturar esta cita');
    }
    // No tiene sentido facturar una cita cancelada o a la que el paciente no asistió.
    if (
      cita.estado === AppointmentStatus.CANCELADA ||
      cita.estado === AppointmentStatus.NO_ASISTIO
    ) {
      throw AppError.unprocessable('No se puede facturar una cita cancelada o no atendida');
    }
    // Evitar facturar dos veces la misma cita (salvo que la previa esté anulada).
    const yaFacturada = await Invoice.findOne({
      citaId: input.citaId,
      estado: { $ne: InvoiceStatus.ANULADA },
    });
    if (yaFacturada) {
      throw AppError.conflict(`Esta cita ya tiene la factura ${yaFacturada.numero}`);
    }
    pacienteId = cita.pacienteId.toString();
    medicoId = cita.medicoId.toString();
  } else {
    const esGestor =
      creator.role === UserRole.ADMIN || creator.role === UserRole.RECEPCIONISTA;
    if (!esGestor) {
      throw AppError.forbidden('Solo Recepción o Admin pueden facturar sin una cita');
    }
    const paciente = await User.findById(input.pacienteId);
    if (!paciente || paciente.rol !== UserRole.PACIENTE) {
      throw AppError.notFound('Paciente no encontrado');
    }
    pacienteId = input.pacienteId!;
  }

  const { subtotal, impuesto, total } = calcularTotales(input.conceptos, input.impuestoPct);

  const factura = await Invoice.create({
    numero: generarNumero(),
    pacienteId,
    medicoId,
    citaId: input.citaId,
    emitidaPor: creator.sub,
    conceptos: input.conceptos,
    subtotal,
    impuestoPct: input.impuestoPct,
    impuesto,
    total,
    notas: input.notas,
  });

  await notify({
    usuarioId: pacienteId,
    tipo: NotificationType.SISTEMA,
    titulo: 'Nueva factura emitida',
    mensaje: `Se emitió la factura ${factura.numero} por S/ ${total.toFixed(2)}.`,
    enlace: '/paciente/mis-facturas',
  });

  return factura.populate([
    { path: 'pacienteId', select: 'nombre apellido' },
    { path: 'medicoId', select: 'nombre apellido' },
  ]);
}

/**
 * Pago en línea de una consulta por el propio paciente (pasarela simulada).
 * Crea —o reutiliza— la factura de la cita y la deja PAGADA. Es idempotente:
 * pagar dos veces no genera facturas duplicadas. La tarifa la define el servidor.
 */
export async function pagarCita(
  requester: AccessTokenPayload,
  citaId: string,
  metodoPago?: string,
) {
  const cita = await Appointment.findById(citaId);
  if (!cita) throw AppError.notFound('Cita no encontrada');
  if (cita.pacienteId.toString() !== requester.sub) {
    throw AppError.forbidden('Solo puedes pagar tus propias citas');
  }
  if (
    cita.estado === AppointmentStatus.CANCELADA ||
    cita.estado === AppointmentStatus.NO_ASISTIO
  ) {
    throw AppError.unprocessable('No se puede pagar una cita cancelada o no atendida');
  }

  const formaPago = (metodoPago ?? 'Tarjeta').toString().slice(0, 60);

  // Reutiliza una factura existente no anulada; si no, la crea.
  let factura = await Invoice.findOne({ citaId, estado: { $ne: InvoiceStatus.ANULADA } });
  if (factura) {
    if (factura.estado !== InvoiceStatus.PAGADA) {
      factura.estado = InvoiceStatus.PAGADA;
      factura.metodoPago = formaPago;
      factura.pagadaEn = new Date();
      await factura.save();
    }
  } else {
    const conceptos = [
      { descripcion: 'Consulta médica', cantidad: 1, precioUnitario: TARIFA_CONSULTA },
    ];
    // Servicios de salud exonerados de IGV en Perú → impuesto 0.
    const { subtotal, impuesto, total } = calcularTotales(conceptos, 0);
    factura = await Invoice.create({
      numero: generarNumero(),
      pacienteId: cita.pacienteId,
      medicoId: cita.medicoId,
      citaId: cita._id,
      emitidaPor: requester.sub,
      conceptos,
      subtotal,
      impuestoPct: 0,
      impuesto,
      total,
      estado: InvoiceStatus.PAGADA,
      metodoPago: formaPago,
      emitidaEn: new Date(),
      pagadaEn: new Date(),
    });
  }

  await notify({
    usuarioId: cita.pacienteId.toString(),
    tipo: NotificationType.SISTEMA,
    titulo: 'Pago confirmado',
    mensaje: `Tu consulta fue pagada. Factura ${factura.numero} disponible en "Mis facturas".`,
    enlace: '/paciente/mis-facturas',
  });

  return factura.populate([
    { path: 'pacienteId', select: 'nombre apellido' },
    { path: 'medicoId', select: 'nombre apellido' },
  ]);
}

/** Lista facturas filtradas por rol: el paciente ve las suyas; admin/médico según corresponde. */
export async function list(requester: AccessTokenPayload) {
  const query: mongoose.FilterQuery<typeof Invoice> = {};
  if (requester.role === UserRole.PACIENTE) {
    query.pacienteId = requester.sub;
  } else if (requester.role === UserRole.MEDICO) {
    query.medicoId = requester.sub;
  }
  return Invoice.find(query)
    .populate('pacienteId', 'nombre apellido')
    .populate('medicoId', 'nombre apellido')
    .sort({ emitidaEn: -1 });
}

async function getOwned(id: string, requester: AccessTokenPayload) {
  const factura = await Invoice.findById(id)
    .populate('pacienteId', 'nombre apellido')
    .populate('medicoId', 'nombre apellido');
  if (!factura) throw AppError.notFound('Factura no encontrada');

  const esGestor =
    requester.role === UserRole.ADMIN || requester.role === UserRole.RECEPCIONISTA;
  const esMedico =
    requester.role === UserRole.MEDICO && factura.medicoId?._id.toString() === requester.sub;
  const esPaciente =
    requester.role === UserRole.PACIENTE && factura.pacienteId._id.toString() === requester.sub;
  if (!esGestor && !esMedico && !esPaciente) {
    throw AppError.forbidden('No puedes ver esta factura');
  }
  return factura;
}

export async function getById(id: string, requester: AccessTokenPayload) {
  return getOwned(id, requester);
}

/** Marca una factura como pagada (Admin). */
export async function marcarPagada(id: string) {
  const factura = await Invoice.findById(id);
  if (!factura) throw AppError.notFound('Factura no encontrada');
  if (factura.estado === InvoiceStatus.ANULADA) {
    throw AppError.conflict('No se puede pagar una factura anulada');
  }
  factura.estado = InvoiceStatus.PAGADA;
  if (!factura.metodoPago) factura.metodoPago = 'Pago en caja';
  factura.pagadaEn = new Date();
  await factura.save();

  await notify({
    usuarioId: factura.pacienteId.toString(),
    tipo: NotificationType.SISTEMA,
    titulo: 'Pago registrado',
    mensaje: `Tu factura ${factura.numero} fue marcada como pagada. ¡Gracias!`,
    enlace: '/paciente/mis-facturas',
  });
  return factura;
}

/** Anula una factura (Admin). */
export async function anular(id: string) {
  const factura = await Invoice.findById(id);
  if (!factura) throw AppError.notFound('Factura no encontrada');
  if (factura.estado === InvoiceStatus.PAGADA) {
    throw AppError.conflict('No se puede anular una factura ya pagada (usa reembolso)');
  }
  factura.estado = InvoiceStatus.ANULADA;
  await factura.save();
  return factura;
}

/** Reembolsa una factura pagada (Admin/Recepción): revierte el cobro. */
export async function reembolsar(id: string) {
  const factura = await Invoice.findById(id);
  if (!factura) throw AppError.notFound('Factura no encontrada');
  if (factura.estado !== InvoiceStatus.PAGADA) {
    throw AppError.conflict('Solo se puede reembolsar una factura pagada');
  }
  factura.estado = InvoiceStatus.REEMBOLSADA;
  await factura.save();

  await notify({
    usuarioId: factura.pacienteId.toString(),
    tipo: NotificationType.SISTEMA,
    titulo: 'Reembolso procesado',
    mensaje: `Se reembolsó la factura ${factura.numero} por S/ ${factura.total.toFixed(2)}.`,
    enlace: '/paciente/mis-facturas',
  });
  return factura;
}

/**
 * Reembolso solicitado por el propio paciente cuando su cita no se realizó
 * (ej. el médico no se presentó). Reembolsa la factura pagada de esa cita.
 */
export async function reembolsarPorCita(requester: AccessTokenPayload, citaId: string) {
  const cita = await Appointment.findById(citaId);
  if (!cita) throw AppError.notFound('Cita no encontrada');
  if (cita.pacienteId.toString() !== requester.sub) {
    throw AppError.forbidden('Solo puedes solicitar el reembolso de tus propias citas');
  }
  if (
    cita.estado !== AppointmentStatus.VENCIDA &&
    cita.estado !== AppointmentStatus.CANCELADA
  ) {
    throw AppError.unprocessable(
      'Solo puedes pedir reembolso de una cita no realizada o cancelada',
    );
  }
  const factura = await Invoice.findOne({ citaId, estado: InvoiceStatus.PAGADA });
  if (!factura) throw AppError.unprocessable('No hay un pago por reembolsar en esta cita');

  factura.estado = InvoiceStatus.REEMBOLSADA;
  await factura.save();

  await notify({
    usuarioId: cita.pacienteId.toString(),
    tipo: NotificationType.SISTEMA,
    titulo: 'Reembolso procesado',
    mensaje: `Se reembolsó tu pago de la factura ${factura.numero}. Lamentamos el inconveniente.`,
    enlace: '/paciente/mis-facturas',
  });
  return factura;
}
