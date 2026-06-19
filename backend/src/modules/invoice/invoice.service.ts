import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';
import { Appointment } from '../../models/appointment.model';
import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import { calcularTotales } from '../../utils/billing';
import { CreateInvoiceInput } from './invoice.validation';
import { notify } from '../notification/notification.service';
import { NotificationType } from '../../models/notification.model';

function generarNumero(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `FAC-${year}-${rand}`;
}

/** Emite una factura. El médico factura sus consultas; el admin puede facturar a cualquiera. */
export async function crear(creator: AccessTokenPayload, input: CreateInvoiceInput) {
  let pacienteId: string;
  let medicoId: string | undefined;

  if (input.appointmentId) {
    const cita = await Appointment.findById(input.appointmentId);
    if (!cita) throw AppError.notFound('Cita no encontrada');

    const esAdmin = creator.role === UserRole.ADMIN;
    const esMedicoDeCita =
      creator.role === UserRole.MEDICO && cita.medicoId.toString() === creator.sub;
    if (!esAdmin && !esMedicoDeCita) {
      throw AppError.forbidden('No puedes facturar esta cita');
    }
    pacienteId = cita.pacienteId.toString();
    medicoId = cita.medicoId.toString();
  } else {
    if (creator.role !== UserRole.ADMIN) {
      throw AppError.forbidden('Solo el admin puede facturar sin una cita');
    }
    const paciente = await User.findById(input.pacienteId);
    if (!paciente || paciente.role !== UserRole.PACIENTE) {
      throw AppError.notFound('Paciente no encontrado');
    }
    pacienteId = input.pacienteId!;
  }

  const { subtotal, impuesto, total } = calcularTotales(input.items, input.impuestoPct);

  const factura = await Invoice.create({
    numero: generarNumero(),
    pacienteId,
    medicoId,
    appointmentId: input.appointmentId,
    emitidaPor: creator.sub,
    items: input.items,
    subtotal,
    impuestoPct: input.impuestoPct,
    impuesto,
    total,
    notas: input.notas,
  });

  await notify({
    userId: pacienteId,
    tipo: NotificationType.SISTEMA,
    titulo: 'Nueva factura emitida',
    mensaje: `Se emitió la factura ${factura.numero} por S/ ${total.toFixed(2)}.`,
    link: '/paciente/mis-facturas',
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

  const esAdmin = requester.role === UserRole.ADMIN;
  const esMedico =
    requester.role === UserRole.MEDICO && factura.medicoId?._id.toString() === requester.sub;
  const esPaciente =
    requester.role === UserRole.PACIENTE && factura.pacienteId._id.toString() === requester.sub;
  if (!esAdmin && !esMedico && !esPaciente) {
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
  factura.pagadaEn = new Date();
  await factura.save();

  await notify({
    userId: factura.pacienteId.toString(),
    tipo: NotificationType.SISTEMA,
    titulo: 'Pago registrado',
    mensaje: `Tu factura ${factura.numero} fue marcada como pagada. ¡Gracias!`,
    link: '/paciente/mis-facturas',
  });
  return factura;
}

/** Anula una factura (Admin). */
export async function anular(id: string) {
  const factura = await Invoice.findById(id);
  if (!factura) throw AppError.notFound('Factura no encontrada');
  if (factura.estado === InvoiceStatus.PAGADA) {
    throw AppError.conflict('No se puede anular una factura ya pagada');
  }
  factura.estado = InvoiceStatus.ANULADA;
  await factura.save();
  return factura;
}
