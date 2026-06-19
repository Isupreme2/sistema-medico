export interface Slot {
  hora: string; // "HH:mm"
  fechaHora: string; // ISO
  disponible: boolean;
}

export interface Availability {
  fecha: string;
  medicoId: string;
  duracionSlotMin: number;
  slots: Slot[];
}

export type AppointmentStatus = 'reservada' | 'atendida' | 'cancelada' | 'no_asistio';
export type AppointmentModality = 'presencial' | 'teleconsulta';

export interface PersonaRef {
  _id: string;
  nombre: string;
  apellido: string;
}

export interface TipoRef {
  _id: string;
  nombre: string;
  color: string;
}

export interface Appointment {
  _id: string;
  medicoId: PersonaRef;
  pacienteId: PersonaRef;
  appointmentTypeId?: TipoRef;
  fechaHora: string;
  duracionMin: number;
  estado: AppointmentStatus;
  modalidad: AppointmentModality;
  motivo?: string;
}

export interface SlotChange {
  medicoId: string;
  fechaHora: string;
  estado: string;
}

export interface VideoAccess {
  canJoin: boolean;
  motivo: string;
  room: string;
  domain: string;
  displayName: string;
  contraparte: string;
  inicio: string;
  fin: string;
  estado: AppointmentStatus;
}

export interface PreConsulta {
  _id?: string;
  appointmentId: string;
  motivoConsulta: string;
  sintomas?: string;
  inicioSintomas?: string;
  nivelDolor?: number;
  medicacionActual?: string;
  antecedentes?: string;
  enviadoEn?: string;
}

export type PreConsultaPayload = Omit<PreConsulta, '_id' | 'appointmentId' | 'enviadoEn'>;
