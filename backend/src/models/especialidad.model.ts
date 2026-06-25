import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Catálogo de especialidades médicas. Sirve para que, al crear un médico,
 * se elija la especialidad de una lista normalizada (con buscador en el front)
 * en lugar de escribirla a mano.
 */
export interface IEspecialidad extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

const especialidadSchema = new Schema<IEspecialidad>(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    activo: { type: Boolean, default: true },
  },
  { collection: 'especialidades', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

export const Especialidad: Model<IEspecialidad> = mongoose.model<IEspecialidad>(
  'Especialidad',
  especialidadSchema,
);
