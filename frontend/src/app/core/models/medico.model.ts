export interface UserBasic {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  activo: boolean;
}

export interface Horario {
  diaSemana: number; // 0=domingo ... 6=sábado
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
}

export interface MedicoProfile {
  _id: string;
  usuarioId: UserBasic;
  especialidad: string;
  numeroColegiatura: string;
  duracionSlotMin: number;
  horarios: Horario[];
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Bloqueo {
  _id: string;
  medicoId: string;
  desde: string;
  hasta: string;
  motivo?: string;
}

export interface AppointmentType {
  _id: string;
  nombre: string;
  duracionMin: number;
  color: string;
  descripcion?: string;
  activo: boolean;
}

export interface CreateMedicoPayload {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  especialidad: string;
  numeroColegiatura: string;
  duracionSlotMin?: number;
}

export const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 0, nombre: 'Domingo' },
];
