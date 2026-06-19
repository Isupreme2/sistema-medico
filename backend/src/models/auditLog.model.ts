import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Registro de auditoría. Se escribe automáticamente para cada acción que
 * MODIFICA datos (POST/PATCH/PUT/DELETE). Es requisito en un sistema de salud:
 * trazabilidad de quién hizo qué y cuándo.
 */
export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  role?: string;
  action: string; // método + ruta, ej: "POST /appointments"
  method: string;
  path: string;
  statusCode: number;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String },
    role: { type: String },
    action: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
