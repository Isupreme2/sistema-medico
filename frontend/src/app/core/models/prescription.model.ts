import { PersonaRef } from './appointment.model';

export interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export interface Prescription {
  _id: string;
  codigo: string;
  medicoId: PersonaRef;
  pacienteId: PersonaRef;
  /** Consulta clínica a la que pertenece la receta (si se emitió desde una). */
  historialId?: string;
  medicamentos: Medicamento[];
  indicaciones?: string;
  emitidaEn: string;
}

export interface SafetyResult {
  alergias: { medicamento: string; alergia: string }[];
  interacciones: { entre: [string, string]; descripcion: string }[];
}

export interface EmitirPayload {
  pacienteId: string;
  historialId?: string;
  medicamentos: Medicamento[];
  indicaciones?: string;
  confirmar?: boolean;
}
