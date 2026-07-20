export enum UserRole {
  ADMIN = 'admin',
  RECEPCIONISTA = 'recepcionista',
  MEDICO = 'medico',
  PACIENTE = 'paciente',
}

/** Paciente en versión reducida (lo que devuelve la búsqueda de Recepción). */
export interface PatientLite {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  alergias?: string[];
}

export interface User {
  _id: string;
  email: string;
  rol: UserRole;
  nombre: string;
  apellido: string;
  telefono?: string;
  alergias?: string[];
  notificarWhatsapp?: boolean;
  fechaNacimiento?: string;
  sexo?: 'M' | 'F' | 'O';
  activo: boolean;
  dosFactores: { habilitado: boolean };
  creadoEn: string;
  actualizadoEn: string;
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
  tipoDocumento: 'DNI' | 'CE' | 'PAS';
  numeroDocumento: string;
  /** Demográficos clave para el riesgo clínico (YYYY-MM-DD). */
  fechaNacimiento?: string;
  sexo?: 'M' | 'F' | 'O';
}

/** Envoltura estándar de respuestas del backend. */
export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}
