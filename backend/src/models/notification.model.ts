import mongoose, { Schema, Document, Model } from 'mongoose';

export enum NotificationType {
  CITA_RESERVADA = 'cita_reservada',
  CITA_CANCELADA = 'cita_cancelada',
  RECORDATORIO = 'recordatorio',
  CONSULTA_REGISTRADA = 'consulta_registrada',
  RECETA_EMITIDA = 'receta_emitida',
  SISTEMA = 'sistema',
}

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  /** Ruta interna del frontend a la que dirige la notificación. */
  link?: string;
  leida: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tipo: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.SISTEMA,
    },
    titulo: { type: String, required: true, trim: true },
    mensaje: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    leida: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// Consulta típica: notificaciones de un usuario, no leídas primero, recientes arriba.
notificationSchema.index({ userId: 1, leida: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
);
