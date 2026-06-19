/**
 * Roles del sistema. El control de acceso (RBAC) se apoya en este enum
 * tanto en el modelo de datos como en el middleware authorize().
 */
export enum UserRole {
  ADMIN = 'admin',
  MEDICO = 'medico',
  PACIENTE = 'paciente',
}

export const ALL_ROLES = Object.values(UserRole);
