/**
 * Roles del sistema. El control de acceso (RBAC) se apoya en este enum
 * tanto en el modelo de datos como en el middleware authorize().
 */
export enum UserRole {
  /** Dirección / Administración del sistema (config, usuarios, auditoría, analítica). */
  ADMIN = 'admin',
  /** Recepción / Registro: agenda por los pacientes, los registra y cobra. */
  RECEPCIONISTA = 'recepcionista',
  MEDICO = 'medico',
  PACIENTE = 'paciente',
}

export const ALL_ROLES = Object.values(UserRole);
