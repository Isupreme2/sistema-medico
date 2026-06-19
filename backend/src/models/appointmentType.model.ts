import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Tipo de cita (ej. "Consulta general" 30min, "Control" 15min, "Procedimiento" 60min).
 * Gestionado por el Admin; la duración se usará al generar la disponibilidad.
 */
export interface IAppointmentType extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  duracionMin: number;
  color: string;
  descripcion?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentTypeSchema = new Schema<IAppointmentType>(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    duracionMin: { type: Number, required: true, min: 5, max: 240 },
    color: { type: String, default: '#2563eb' },
    descripcion: { type: String, trim: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const AppointmentType: Model<IAppointmentType> = mongoose.model<IAppointmentType>(
  'AppointmentType',
  appointmentTypeSchema,
);
