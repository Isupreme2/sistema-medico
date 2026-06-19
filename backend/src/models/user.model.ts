import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, ALL_ROLES } from '../constants/roles';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  nombre: string;
  apellido: string;
  telefono?: string;
  isActive: boolean;

  /** Se incrementa para invalidar todos los refresh tokens del usuario. */
  tokenVersion: number;

  /** 2FA (TOTP) — scaffolding listo para activarse en el flujo de login. */
  twoFactor: {
    enabled: boolean;
    secret?: string; // base32; nunca se expone en las respuestas
  };

  /** Seguridad: bloqueo temporal tras varios intentos fallidos. */
  failedLoginAttempts: number;
  lockUntil?: Date;

  createdAt: Date;
  updatedAt: Date;

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
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ALL_ROLES,
      required: true,
      default: UserRole.PACIENTE,
      index: true,
    },
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    telefono: { type: String, trim: true },
    isActive: { type: Boolean, default: true },

    tokenVersion: { type: Number, default: 0 },

    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
    },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        if (ret.twoFactor && typeof ret.twoFactor === 'object') {
          delete (ret.twoFactor as Record<string, unknown>).secret;
        }
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.isLocked = function (): boolean {
  return !!this.lockUntil && this.lockUntil.getTime() > Date.now();
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
