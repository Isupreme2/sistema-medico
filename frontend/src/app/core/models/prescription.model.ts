import { PersonaRef } from './appointment.model';

export interface Medicamento {
  nombre: string;
  // Campos estructurados (recetas nuevas)
  forma?: string;
  concentracion?: string;
  cantidad?: string;
  unidad?: string;
  horas?: string[];
  dias?: number;
  segunNecesidad?: boolean;
  momento?: string;
  // Derivados / legacy
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
}

/** Lo que el médico envía al emitir (estructura pura, sin derivados). */
export interface MedicamentoInput {
  forma: string;
  nombre: string;
  concentracion: string;
  cantidad: string;
  momento?: string;
  segunNecesidad?: boolean;
  horas?: string[];
  dias?: number;
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
  inicioTratamiento?: string;
  emitidaEn: string;
}

export interface SafetyResult {
  alergias: { medicamento: string; alergia: string }[];
  interacciones: { entre: [string, string]; descripcion: string }[];
}

export interface EmitirPayload {
  pacienteId: string;
  historialId?: string;
  inicio?: string;
  medicamentos: MedicamentoInput[];
  indicaciones?: string;
  confirmar?: boolean;
}
