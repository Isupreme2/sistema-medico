import { PersonaRef } from './appointment.model';

export interface SignosVitales {
  peso?: number;
  talla?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  frecuenciaCardiaca?: number;
  temperatura?: number;
  glucosa?: number;
  saturacionO2?: number;
}

export interface MedicalRecord {
  _id: string;
  pacienteId: PersonaRef;
  medicoId: PersonaRef;
  appointmentId?: string;
  fecha: string;
  motivo?: string;
  diagnostico: string;
  cie10?: string;
  notas?: string;
  tratamiento?: string;
  signosVitales?: SignosVitales;
  createdAt: string;
}

export interface CreateRecordPayload {
  pacienteId: string;
  appointmentId?: string;
  motivo?: string;
  diagnostico: string;
  cie10?: string;
  notas?: string;
  tratamiento?: string;
  signosVitales?: SignosVitales;
}
