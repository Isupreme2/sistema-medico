import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, ALL_ROLES } from '../constants/roles';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  claveHash: string;
  rol: UserRole;
  nombre: string;
  apellido: string;
  telefono?: string;
  /** Documento de identidad (obligatorio en el registro de pacientes). */
  tipoDocumento?: 'DNI' | 'CE' | 'PAS';
  numeroDocumento?: string;
  /** Alergias del paciente (a fármacos). Base de la alerta al recetar. */
  alergias: string[];
  /** Opt-in: recibir recordatorios de toma por WhatsApp (requiere teléfono). */
  notificarWhatsapp: boolean;
  activo: boolean;

  /** Se incrementa para invalidar todos los refresh tokens del usuario. */
  versionToken: number;

  /** 2FA (TOTP) — scaffolding listo para activarse en el flujo de login. */
  dosFactores: {
    habilitado: boolean;
    secreto?: string; // base32; nunca se expone en las respuestas
  };

  /** Seguridad: bloqueo temporal tras varios intentos fallidos. */
  intentosFallidos: number;
  bloqueadoHasta?: Date;

  creadoEn: Date;
  actualizadoEn: Date;

  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    claveHash: { type: String, required: true, select: false },
    rol: {
      type: String,
      enum: ALL_ROLES,
      required: true,
      default: UserRole.PACIENTE,
      index: true,
    },
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    telefono: { type: String, trim: true },
    tipoDocumento: { type: String, enum: ['DNI', 'CE', 'PAS'], default: 'DNI' },
    numeroDocumento: { type: String, trim: true },
    alergias: { type: [String], default: [] },
    notificarWhatsapp: { type: Boolean, default: true },
    activo: { type: Boolean, default: true },

    versionToken: { type: Number, default: 0 },

    dosFactores: {
      habilitado: { type: Boolean, default: false },
      secreto: { type: String, select: false },
    },

    intentosFallidos: { type: Number, default: 0 },
    bloqueadoHasta: { type: Date },
  },
  {
    collection: 'usuarios',
    timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.claveHash;
        if (ret.dosFactores && typeof ret.dosFactores === 'object') {
          delete (ret.dosFactores as Record<string, unknown>).secreto;
        }
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.claveHash);
};

userSchema.methods.isLocked = function (): boolean {
  return !!this.bloqueadoHasta && this.bloqueadoHasta.getTime() > Date.now();
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
