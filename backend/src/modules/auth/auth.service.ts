import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { User, IUser } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { env } from '../../config/env';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { RegisterInput, LoginInput } from './auth.validation';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function issueTokens(user: IUser): AuthTokens {
  return {
    accessToken: signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    }),
    refreshToken: signRefreshToken({
      sub: user._id.toString(),
      tokenVersion: user.tokenVersion,
    }),
  };
}

/**
 * Registro público: siempre crea PACIENTE.
 * (Los médicos y administradores los crea el Admin en el módulo de usuarios.)
 */
export async function register(input: RegisterInput): Promise<IUser> {
  const exists = await User.findOne({ email: input.email.toLowerCase() });
  if (exists) {
    throw AppError.conflict('Ya existe una cuenta con ese email');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    role: UserRole.PACIENTE,
    nombre: input.nombre,
    apellido: input.apellido,
    telefono: input.telefono,
  });

  return user;
}

/**
 * Login con: verificación de contraseña, bloqueo por intentos fallidos
 * y segundo factor TOTP si está activado.
 */
export async function login(
  input: LoginInput,
): Promise<{ user: IUser; tokens: AuthTokens }> {
  // +passwordHash y +twoFactor.secret están con select:false en el esquema
  const user = await User.findOne({ email: input.email.toLowerCase() })
    .select('+passwordHash +twoFactor.secret');

  if (!user) {
    throw AppError.unauthorized('Credenciales inválidas');
  }

  if (user.isLocked()) {
    throw AppError.forbidden(
      'Cuenta bloqueada temporalmente por intentos fallidos. Intenta más tarde.',
    );
  }

  if (!user.isActive) {
    throw AppError.forbidden('La cuenta está desactivada');
  }

  const ok = await user.comparePassword(input.password);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw AppError.unauthorized('Credenciales inválidas');
  }

  // Segundo factor (si está habilitado)
  if (user.twoFactor.enabled) {
    if (!input.totp) {
      throw AppError.unauthorized('Se requiere el código de verificación (2FA)');
    }
    const valid = speakeasy.totp.verify({
      secret: user.twoFactor.secret ?? '',
      encoding: 'base32',
      token: input.totp,
      window: 1,
    });
    if (!valid) {
      throw AppError.unauthorized('Código 2FA inválido');
    }
  }

  // Login correcto → reset de contadores de seguridad
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  return { user, tokens: issueTokens(user) };
}

/**
 * Rota tokens a partir de un refresh token válido.
 * Verifica tokenVersion para soportar invalidación (logout global).
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Refresh token inválido o expirado');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Usuario no válido');
  }
  if (user.tokenVersion !== payload.tokenVersion) {
    throw AppError.unauthorized('Sesión revocada, inicia sesión nuevamente');
  }

  return issueTokens(user);
}

/** Logout global: invalida todos los refresh tokens incrementando la versión. */
export async function logout(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
}

export async function getMe(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('Usuario no encontrado');
  }
  return user;
}

/**
 * Inicia la configuración de 2FA: genera un secreto y un QR para escanear.
 * El usuario debe confirmar con un código antes de que se active (enable2FA).
 */
export async function setup2FA(
  userId: string,
): Promise<{ otpauthUrl: string; qrDataUrl: string }> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('Usuario no encontrado');

  const secret = speakeasy.generateSecret({
    name: `${env.APP_NAME} (${user.email})`,
  });

  user.twoFactor.secret = secret.base32;
  user.twoFactor.enabled = false; // se activa al confirmar
  await user.save();

  const otpauthUrl = secret.otpauth_url ?? '';
  const qrDataUrl = await qrcode.toDataURL(otpauthUrl);
  return { otpauthUrl, qrDataUrl };
}

/** Confirma y activa 2FA validando el primer código TOTP. */
export async function enable2FA(userId: string, totp: string): Promise<void> {
  const user = await User.findById(userId).select('+twoFactor.secret');
  if (!user || !user.twoFactor.secret) {
    throw AppError.badRequest('Primero debes iniciar la configuración de 2FA');
  }
  const valid = speakeasy.totp.verify({
    secret: user.twoFactor.secret,
    encoding: 'base32',
    token: totp,
    window: 1,
  });
  if (!valid) throw AppError.unauthorized('Código 2FA inválido');

  user.twoFactor.enabled = true;
  await user.save();
}
