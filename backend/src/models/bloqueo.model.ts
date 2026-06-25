import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Bloqueo de agenda de un médico: vacaciones, feriados, almuerzo, etc.
 * Durante este rango no se ofrecen slots disponibles.
 */
export interface IBloqueo extends Document {
  _id: mongoose.Types.ObjectId;
  medicoId: mongoose.Types.ObjectId;
  desde: Date;
  hasta: Date;
  motivo?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

const bloqueoSchema = new Schema<IBloqueo>(
  {
    medicoId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    desde: { type: Date, required: true },
    hasta: { type: Date, required: true },
    motivo: { type: String, trim: true },
  },
  { collection: 'bloqueos', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

bloqueoSchema.index({ medicoId: 1, desde: 1, hasta: 1 });

export const Bloqueo: Model<IBloqueo> = mongoose.model<IBloqueo>('Bloqueo', bloqueoSchema);
