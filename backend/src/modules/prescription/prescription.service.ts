import crypto from 'node:crypto';
import { Prescription, IPrescription, IMedicamento } from '../../models/prescription.model';
import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import { checkPrescription, tieneConflictos } from '../../utils/drugSafety';
import { unidadDeForma } from '../../constants/medicationForms';
import { EmitirInput, MedicamentoInput } from './prescription.validation';
import { notify } from '../notification/notification.service';
import { NotificationType } from '../../models/notification.model';

/** Genera un código legible y único de receta: RX-AAAA-XXXXXX. */
function generarCodigo(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `RX-${year}-${rand}`;
}

/**
 * Proyección canónica de un medicamento para el hash: solo los campos legacy
 * (texto). Al derivarlos siempre a partir de la estructura, el hash es estable
 * y `verificar` (que usa la misma proyección) valida recetas viejas y nuevas.
 */
function medsParaHash(
  meds: Pick<IMedicamento, 'nombre' | 'dosis' | 'frecuencia' | 'duracion'>[],
) {
  return meds.map((m) => ({
    nombre: m.nombre,
    dosis: m.dosis,
    frecuencia: m.frecuencia,
    duracion: m.duracion,
  }));
}

/** Hash SHA-256 del contenido relevante (integridad/verificación). */
function calcularHash(data: {
  codigo: string;
  pacienteId: string;
  medicamentos: Pick<IMedicamento, 'nombre' | 'dosis' | 'frecuencia' | 'duracion'>[];
  emitidaEn: Date;
}): string {
  const canonical = JSON.stringify({
    codigo: data.codigo,
    pacienteId: data.pacienteId,
    medicamentos: medsParaHash(data.medicamentos),
    emitidaEn: data.emitidaEn.toISOString(),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Convierte la entrada estructurada del médico en el documento a persistir:
 * calcula la unidad según la forma y deriva los textos legacy (dosis,
 * frecuencia, duración) que consumen el PDF, la verificación y las vistas.
 */
function construirMedicamento(m: MedicamentoInput): IMedicamento {
  const unidad = unidadDeForma(m.forma);
  const dosis = `${m.cantidad} ${unidad} · ${m.concentracion}`;
  const frecuencia = m.segunNecesidad
    ? 'Según necesidad'
    : `${m.horas!.length} ${m.horas!.length === 1 ? 'vez' : 'veces'}/día (${m.horas!.join(', ')})`;
  const duracion = m.segunNecesidad ? 'Según necesidad' : `${m.dias} día(s)`;

  return {
    nombre: m.nombre,
    forma: m.forma,
    concentracion: m.concentracion,
    cantidad: m.cantidad,
    unidad,
    horas: m.segunNecesidad ? undefined : m.horas,
    dias: m.segunNecesidad ? undefined : m.dias,
    segunNecesidad: m.segunNecesidad ?? false,
    momento: m.momento,
    dosis,
    frecuencia,
    duracion,
  };
}

/**
 * Emite una receta. ⭐ Cruza los medicamentos contra las alergias del paciente
 * y las interacciones conocidas. Si hay conflictos y el médico no confirmó,
 * bloquea (422) devolviendo las alertas para que el front las muestre.
 */
export async function emitir(medicoId: string, input: EmitirInput) {
  const paciente = await User.findById(input.pacienteId);
  if (!paciente || paciente.rol !== UserRole.PACIENTE) {
    throw AppError.notFound('Paciente no encontrado');
  }

  const safety = checkPrescription(input.medicamentos, paciente.alergias);

  if (tieneConflictos(safety) && !input.confirmar) {
    throw new AppError(422, 'Alertas de seguridad farmacológica detectadas', {
      requiereConfirmacion: true,
      ...safety,
    });
  }

  const medicamentos = input.medicamentos.map(construirMedicamento);
  const emitidaEn = new Date();
  const inicioTratamiento = input.inicio ? new Date(input.inicio) : emitidaEn;
  const codigo = generarCodigo();
  const hash = calcularHash({
    codigo,
    pacienteId: input.pacienteId,
    medicamentos,
    emitidaEn,
  });

  const receta = await Prescription.create({
    codigo,
    medicoId,
    pacienteId: input.pacienteId,
    historialId: input.historialId,
    medicamentos,
    indicaciones: input.indicaciones,
    inicioTratamiento,
    emitidaEn,
    hash,
  });

  const populated = await receta.populate([
    { path: 'medicoId', select: 'nombre apellido' },
    { path: 'pacienteId', select: 'nombre apellido' },
  ]);

  await notify({
    usuarioId: input.pacienteId,
    tipo: NotificationType.RECETA_EMITIDA,
    titulo: 'Nueva receta digital',
    mensaje: `Se emitió tu receta ${codigo}. Ya puedes descargarla en PDF.`,
    enlace: '/paciente/mis-recetas',
  });

  return { receta: populated, safety };
}

export async function listByPatient(pacienteId: string, requester: AccessTokenPayload) {
  if (requester.role === UserRole.PACIENTE && requester.sub !== pacienteId) {
    throw AppError.forbidden('Solo puedes ver tus propias recetas');
  }
  return Prescription.find({ pacienteId })
    .populate('medicoId', 'nombre apellido')
    .populate('pacienteId', 'nombre apellido')
    .sort({ emitidaEn: -1 });
}

/** Carga una receta validando propiedad (médico, paciente dueño o admin). */
export async function getOwned(id: string, requester: AccessTokenPayload): Promise<IPrescription> {
  const receta = await Prescription.findById(id)
    .populate('medicoId', 'nombre apellido')
    .populate('pacienteId', 'nombre apellido');
  if (!receta) throw AppError.notFound('Receta no encontrada');

  const esAdmin = requester.role === UserRole.ADMIN;
  const esMedico = requester.role === UserRole.MEDICO;
  const esPacienteDueno =
    requester.role === UserRole.PACIENTE && receta.pacienteId._id.toString() === requester.sub;

  if (!esAdmin && !esMedico && !esPacienteDueno) {
    throw AppError.forbidden('No puedes ver esta receta');
  }
  return receta;
}

/**
 * Verificación PÚBLICA por código: confirma autenticidad e integridad
 * (recalcula el hash) sin exponer datos sensibles.
 */
export async function verificar(codigo: string) {
  const receta = await Prescription.findOne({ codigo })
    .populate('medicoId', 'nombre apellido')
    .populate('pacienteId', 'nombre apellido');

  if (!receta) {
    return { valido: false as const };
  }

  const hashRecalculado = calcularHash({
    codigo: receta.codigo,
    pacienteId: receta.pacienteId._id.toString(),
    medicamentos: receta.medicamentos.map((m) => ({
      nombre: m.nombre,
      dosis: m.dosis,
      frecuencia: m.frecuencia,
      duracion: m.duracion,
    })),
    emitidaEn: receta.emitidaEn,
  });

  const medico = receta.medicoId as unknown as { nombre: string; apellido: string };

  return {
    valido: true as const,
    integridadOk: hashRecalculado === receta.hash,
    codigo: receta.codigo,
    emitidaEn: receta.emitidaEn,
    medico: `${medico.nombre} ${medico.apellido}`,
    cantidadMedicamentos: receta.medicamentos.length,
  };
}
