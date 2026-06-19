export enum UserRole {
  ADMIN = 'admin',
  MEDICO = 'medico',
  PACIENTE = 'paciente',
}

export interface User {
  _id: string;
  email: string;
  role: UserRole;
  nombre: string;
  apellido: string;
  telefono?: string;
  alergias?: string[];
  isActive: boolean;
  twoFactor: { enabled: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  totp?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
}

/** Envoltura estándar de respuestas del backend. */
export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}
