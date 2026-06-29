import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { CreateStaffInput } from './staff.validation';

const BCRYPT_ROUNDS = 12;

/** El Admin crea una cuenta de Recepción (Registrador). */
export async function createRecepcionista(input: CreateStaffInput) {
  const exists = await User.findOne({ email: input.email.toLowerCase() });
  if (exists) throw AppError.conflict('Ya existe una cuenta con ese email');

  const claveHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return User.create({
    email: input.email.toLowerCase(),
    claveHash,
    rol: UserRole.RECEPCIONISTA,
    nombre: input.nombre,
    apellido: input.apellido,
    telefono: input.telefono,
  });
}

/** Lista las cuentas de recepción (para el panel del Admin). */
export async function listRecepcionistas() {
  return User.find({ rol: UserRole.RECEPCIONISTA })
    .select('nombre apellido email telefono activo creadoEn')
    .sort({ creadoEn: -1 });
}
