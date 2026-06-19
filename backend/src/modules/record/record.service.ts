import { MedicalRecord } from '../../models/medicalRecord.model';
import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import { CreateRecordInput } from './record.validation';
import { notify } from '../notification/notification.service';
import { NotificationType } from '../../models/notification.model';

/** El médico crea una consulta clínica para un paciente. */
export async function createRecord(medicoId: string, input: CreateRecordInput) {
  const paciente = await User.findById(input.pacienteId);
  if (!paciente || paciente.role !== UserRole.PACIENTE) {
    throw AppError.notFound('Paciente no encontrado');
  }

  const record = await MedicalRecord.create({
    ...input,
    medicoId,
  });

  const populated = await record.populate([
    { path: 'medicoId', select: 'nombre apellido' },
    { path: 'pacienteId', select: 'nombre apellido' },
  ]);

  await notify({
    userId: input.pacienteId,
    tipo: NotificationType.CONSULTA_REGISTRADA,
    titulo: 'Nueva consulta en tu historial',
    mensaje: 'Tu médico registró una nueva consulta clínica. Ya puedes revisarla.',
    link: '/paciente/historial',
  });

  return populated;
}

/**
 * Lista el historial clínico de un paciente.
 * Acceso: el propio paciente, cualquier médico (tratante) o admin.
 */
export async function listByPatient(pacienteId: string, requester: AccessTokenPayload) {
  if (requester.role === UserRole.PACIENTE && requester.sub !== pacienteId) {
    throw AppError.forbidden('Solo puedes ver tu propia historia clínica');
  }

  return MedicalRecord.find({ pacienteId })
    .populate('medicoId', 'nombre apellido')
    .populate('pacienteId', 'nombre apellido')
    .sort({ fecha: -1 });
}

/** Obtiene una consulta concreta, validando la propiedad por rol. */
export async function getById(id: string, requester: AccessTokenPayload) {
  const record = await MedicalRecord.findById(id)
    .populate('medicoId', 'nombre apellido')
    .populate('pacienteId', 'nombre apellido');
  if (!record) throw AppError.notFound('Consulta no encontrada');

  const esAdmin = requester.role === UserRole.ADMIN;
  const esMedico = requester.role === UserRole.MEDICO;
  const esPacienteDueno =
    requester.role === UserRole.PACIENTE &&
    record.pacienteId._id.toString() === requester.sub;

  if (!esAdmin && !esMedico && !esPacienteDueno) {
    throw AppError.forbidden('No puedes ver esta consulta');
  }
  return record;
}
