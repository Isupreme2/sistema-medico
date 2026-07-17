import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMedicamento {
  nombre: string;
  // --- Campos estructurados (recetas nuevas) ---
  forma?: string;
  concentracion?: string; // ej. "500 mg", "250 mg/5 ml"
  cantidad?: string; // "cantidad a tomar": "1/2", "1", "10"
  unidad?: string; // derivada de la forma: "tableta(s)", "ml"…
  horas?: string[]; // horarios de toma "HH:mm" (permite doble horario)
  dias?: number; // duración del tratamiento en días
  segunNecesidad?: boolean; // PRN: sin horario fijo (ej. "si hay dolor")
  momento?: string; // respecto a comidas: ayunas | con_alimentos | despues_comer
  // --- Campos derivados / legacy (para PDF, verificación y compatibilidad) ---
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
}

export interface IPrescription extends Document {
  _id: mongoose.Types.ObjectId;
  codigo: string; // ej. RX-2026-A3F9K2
  medicoId: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  historialId?: mongoose.Types.ObjectId;
  medicamentos: IMedicamento[];
  indicaciones?: string;
  /** Momento en que arranca el tratamiento (base para los recordatorios). */
  inicioTratamiento?: Date;
  emitidaEn: Date;
  hash: string; // SHA-256 del contenido → integridad/verificación
  creadoEn: Date;
  actualizadoEn: Date;
}

const medicamentoSchema = new Schema<IMedicamento>(
  {
    nombre: { type: String, required: true, trim: true },
    forma: { type: String, trim: true },
    concentracion: { type: String, trim: true },
    cantidad: { type: String, trim: true },
    unidad: { type: String, trim: true },
    horas: { type: [String], default: undefined },
    dias: { type: Number },
    segunNecesidad: { type: Boolean, default: false },
    momento: { type: String, trim: true },
    // Derivados/legacy: opcionales para no romper recetas antiguas.
    dosis: { type: String, trim: true },
    frecuencia: { type: String, trim: true },
    duracion: { type: String, trim: true },
  },
  { _id: false },
);

const prescriptionSchema = new Schema<IPrescription>(
  {
    codigo: { type: String, required: true, unique: true, index: true },
    medicoId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pacienteId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    historialId: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    medicamentos: { type: [medicamentoSchema], required: true },
    indicaciones: { type: String, trim: true, maxlength: 2000 },
    inicioTratamiento: { type: Date },
    emitidaEn: { type: Date, default: Date.now },
    hash: { type: String, required: true },
  },
  { collection: 'recetas', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

export const Prescription: Model<IPrescription> = mongoose.model<IPrescription>(
  'Prescription',
  prescriptionSchema,
);
