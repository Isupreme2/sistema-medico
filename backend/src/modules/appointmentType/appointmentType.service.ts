import { AppointmentType } from '../../models/appointmentType.model';
import { AppError } from '../../utils/AppError';
import { CreateTypeInput, UpdateTypeInput } from './appointmentType.validation';

export async function listTypes(soloActivos = false) {
  const filter = soloActivos ? { activo: true } : {};
  return AppointmentType.find(filter).sort({ nombre: 1 });
}

export async function createType(input: CreateTypeInput) {
  return AppointmentType.create(input);
}

export async function updateType(id: string, input: UpdateTypeInput) {
  const type = await AppointmentType.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  });
  if (!type) throw AppError.notFound('Tipo de cita no encontrado');
  return type;
}

export async function deleteType(id: string) {
  const type = await AppointmentType.findByIdAndDelete(id);
  if (!type) throw AppError.notFound('Tipo de cita no encontrado');
}
