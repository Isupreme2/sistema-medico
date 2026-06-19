import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../constants/roles';

export interface AccessTokenPayload {
  sub: string; // userId
  role: UserRole;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number; // permite invalidar todos los refresh de un usuario
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options = { expiresIn: env.JWT_ACCESS_EXPIRES } as SignOptions;
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const options = { expiresIn: env.JWT_REFRESH_EXPIRES } as SignOptions;
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
