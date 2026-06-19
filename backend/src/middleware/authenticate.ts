import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

/**
 * Verifica el access token del header Authorization: Bearer <token>.
 * Si es válido, inyecta req.user; si no, responde 401.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Token de acceso ausente');
  }

  const token = header.slice(7);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw AppError.unauthorized('Token de acceso inválido o expirado');
  }
}
