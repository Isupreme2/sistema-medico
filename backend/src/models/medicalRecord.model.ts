import mongoose, { Schema, Document, Model } from 'mongoose';

/** Signos vitales registrados en la consulta (todos opcionales). */
export interface ISignosVitales {
  peso?: number; // kg
  talla?: number; // cm
  presionSistolica?: number; // mmHg
  presionDiastolica?: number; // mmHg
  frecuenciaCardiaca?: number; // lpm
  temperatura?: number; // °C
  glucosa?: number; // mg/dL
  saturacionO2?: number; // %
}

export interface IMedicalRecord extends Document {
  _id: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  medicoId: mongoose.Types.ObjectId;
  citaId?: mongoose.Types.ObjectId;
  fecha: Date;
  motivo?: string;
  diagnostico: string;
  cie10?: string; // código CIE-10 (estándar)
  notas?: string;
  tratamiento?: string;
  signosVitales?: ISignosVitales;
  creadoEn: Date;
  actualizadoEn: Date;
}

const signosVitalesSchema = new Schema<ISignosVitales>(
  {
    peso: { type: Number, min: 0, max: 500 },
    talla: { type: Number, min: 0, max: 300 },
    presionSistolica: { type: Number, min: 0, max: 300 },
    presionDiastolica: { type: Number, min: 0, max: 200 },
    frecuenciaCardiaca: { type: Number, min: 0, max: 400 },
    temperatura: { type: Number, min: 0, max: 50 },
    glucosa: { type: Number, min: 0, max: 1000 },
    saturacionO2: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
);

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    pacienteId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicoId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    citaId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    fecha: { type: Date, default: Date.now },
    motivo: { type: String, trim: true, maxlength: 500 },
    diagnostico: { type: String, required: true, trim: true, maxlength: 2000 },
    cie10: { type: String, trim: true, maxlength: 20 },
    notas: { type: String, trim: true, maxlength: 5000 },
    tratamiento: { type: String, trim: true, maxlength: 5000 },
    signosVitales: { type: signosVitalesSchema },
  },
  { collection: 'historiales', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

// Para listar el historial de un paciente ordenado por fecha
medicalRecordSchema.index({ pacienteId: 1, fecha: -1 });

export const MedicalRecord: Model<IMedicalRecord> = mongoose.model<IMedicalRecord>(
  'MedicalRecord',
  medicalRecordSchema,
);
