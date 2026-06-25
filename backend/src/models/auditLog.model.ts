import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Registro de auditoría. Se escribe automáticamente para cada acción que
 * MODIFICA datos (POST/PATCH/PUT/DELETE). Es requisito en un sistema de salud:
 * trazabilidad de quién hizo qué y cuándo.
 */
export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  usuarioId?: mongoose.Types.ObjectId;
  emailUsuario?: string;
  rol?: string;
  accion: string; // método + ruta, ej: "POST /appointments"
  metodo: string;
  ruta: string;
  codigoEstado: number;
  ip?: string;
  creadoEn: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    emailUsuario: { type: String },
    rol: { type: String },
    accion: { type: String, required: true },
    metodo: { type: String, required: true },
    ruta: { type: String, required: true },
    codigoEstado: { type: Number, required: true },
    ip: { type: String },
  },
  {
    collection: 'auditoria',
    timestamps: { createdAt: 'creadoEn', updatedAt: false },
  },
);

auditLogSchema.index({ creadoEn: -1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

