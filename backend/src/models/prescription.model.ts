import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMedicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export interface IPrescription extends Document {
  _id: mongoose.Types.ObjectId;
  codigo: string; // ej. RX-2026-A3F9K2
  medicoId: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  historialId?: mongoose.Types.ObjectId;
  medicamentos: IMedicamento[];
  indicaciones?: string;
  emitidaEn: Date;
  hash: string; // SHA-256 del contenido → integridad/verificación
  creadoEn: Date;
  actualizadoEn: Date;
}

const medicamentoSchema = new Schema<IMedicamento>(
  {
    nombre: { type: String, required: true, trim: true },
    dosis: { type: String, required: true, trim: true },
    frecuencia: { type: String, required: true, trim: true },
    duracion: { type: String, required: true, trim: true },
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
    emitidaEn: { type: Date, default: Date.now },
    hash: { type: String, required: true },
  },
  { collection: 'recetas', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

export const Prescription: Model<IPrescription> = mongoose.model<IPrescription>(
  'Prescription',
  prescriptionSchema,
);
