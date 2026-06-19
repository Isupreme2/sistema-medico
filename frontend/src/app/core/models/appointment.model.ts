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
  motivo?: string;
}

export interface SlotChange {
  medicoId: string;
  fechaHora: string;
  estado: string;
}
