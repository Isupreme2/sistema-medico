import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AppointmentStatus {
  RESERVADA = 'reservada',
  ATENDIDA = 'atendida',
  CANCELADA = 'cancelada',
  NO_ASISTIO = 'no_asistio',
}

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  medicoId: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  appointmentTypeId?: mongoose.Types.ObjectId;
  fechaHora: Date; // inicio del slot
  duracionMin: number;
  estado: AppointmentStatus;
  motivo?: string;
  /** Evita reenviar el recordatorio por email de una misma cita. */
  recordatorioEnviado: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    medicoId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pacienteId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentTypeId: { type: Schema.Types.ObjectId, ref: 'AppointmentType' },
    fechaHora: { type: Date, required: true },
    duracionMin: { type: Number, required: true, default: 30 },
    estado: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.RESERVADA,
      index: true,
    },
    motivo: { type: String, trim: true, maxlength: 500 },
    recordatorioEnviado: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/**
 * ÍNDICE CLAVE — anti doble-reserva.
 * Impide a nivel de base de datos dos citas 'reservada' del mismo médico
 * en el mismo instante. El partialFilterExpression hace que, al cancelar
 * (estado != 'reservada'), el slot quede libre nuevamente.
 */
appointmentSchema.index(
  { medicoId: 1, fechaHora: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: AppointmentStatus.RESERVADA },
  },
);

export const Appointment: Model<IAppointment> = mongoose.model<IAppointment>(
  'Appointment',
  appointmentSchema,
);
