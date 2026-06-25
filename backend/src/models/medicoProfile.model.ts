import mongoose, { Schema, Document, Model } from 'mongoose';

/** Franja horaria de atención semanal recurrente. */
export interface IHorario {
  diaSemana: number; // 0=domingo ... 6=sábado
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
}

export interface IMedicoProfile extends Document {
  _id: mongoose.Types.ObjectId;
  usuarioId: mongoose.Types.ObjectId;
  especialidad: string;
  numeroColegiatura: string;
  /** Duración por defecto de un slot, en minutos (base para generar disponibilidad). */
  duracionSlotMin: number;
  horarios: IHorario[];
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

const horarioSchema = new Schema<IHorario>(
  {
    diaSemana: { type: Number, required: true, min: 0, max: 6 },
    horaInicio: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)'],
    },
    horaFin: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)'],
    },
  },
  { _id: false },
);

const medicoProfileSchema = new Schema<IMedicoProfile>(
  {
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    especialidad: { type: String, required: true, trim: true },
    numeroColegiatura: { type: String, required: true, trim: true },
    duracionSlotMin: { type: Number, default: 30, min: 5, max: 240 },
    horarios: { type: [horarioSchema], default: [] },
    activo: { type: Boolean, default: true },
  },
  { collection: 'perfilesmedicos', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

export const MedicoProfile: Model<IMedicoProfile> = mongoose.model<IMedicoProfile>(
  'MedicoProfile',
  medicoProfileSchema,
);
