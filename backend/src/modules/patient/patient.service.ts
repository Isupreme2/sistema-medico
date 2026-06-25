import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { RegisterInput } from '../auth/auth.validation';
import * as authService from '../auth/auth.service';

/** Campos públicos de un paciente que necesita Recepción para seleccionarlo/agendar. */
const PATIENT_FIELDS = 'nombre apellido email telefono alergias creadoEn';

/**
 * Busca pacientes por nombre, apellido o email. Pensado para que Recepción
 * encuentre al paciente al agendar o facturar. Limitado a 50 resultados.
 */
export async function search(q?: string) {
  const filter: Record<string, unknown> = { rol: UserRole.PACIENTE, activo: true };

  const term = q?.trim();
  if (term) {
    // Se escapa el término para evitar inyección de regex.
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [{ nombre: rx }, { apellido: rx }, { email: rx }];
  }

  return User.find(filter).select(PATIENT_FIELDS).sort({ creadoEn: -1 }).limit(50);
}

/**
 * Recepción/Admin registra un nuevo paciente. Reutiliza el alta de auth
 * (que siempre crea rol PACIENTE), evitando duplicar la lógica de hash/validación.
 */
export async function create(input: RegisterInput) {
  return authService.register(input);
}
