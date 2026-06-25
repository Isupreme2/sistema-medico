import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Formulario de pre-consulta (intake) que el paciente completa antes de su cita.
 * Le da contexto al médico y agiliza la atención (sobre todo en teleconsulta).
 * Relación 1:1 con la cita (citaId único).
 */
export interface IPreConsulta extends Document {
  _id: mongoose.Types.ObjectId;
  citaId: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  medicoId: mongoose.Types.ObjectId;
  motivoConsulta: string;
  sintomas?: string;
  inicioSintomas?: string;
  nivelDolor?: number; // 0-10
  medicacionActual?: string;
  antecedentes?: string;
  enviadoEn: Date;
  creadoEn: Date;
  actualizadoEn: Date;
}

const preConsultaSchema = new Schema<IPreConsulta>(
  {
    citaId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    pacienteId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicoId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    motivoConsulta: { type: String, required: true, trim: true, maxlength: 1000 },
    sintomas: { type: String, trim: true, maxlength: 2000 },
    inicioSintomas: { type: String, trim: true, maxlength: 200 },
    nivelDolor: { type: Number, min: 0, max: 10 },
    medicacionActual: { type: String, trim: true, maxlength: 2000 },
    antecedentes: { type: String, trim: true, maxlength: 2000 },
    enviadoEn: { type: Date, default: Date.now },
  },
  { collection: 'preconsultas', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

export const PreConsulta: Model<IPreConsulta> = mongoose.model<IPreConsulta>(
  'PreConsulta',
  preConsultaSchema,
);
