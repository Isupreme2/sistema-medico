import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/auditLog.model';
import { logger } from '../utils/logger';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Registra en AuditLog toda acción que modifica datos. Adjunta un listener al
 * evento 'finish' de la respuesta para conocer el status final y el usuario ya
 * autenticado. Es fire-and-forget: un fallo de auditoría no afecta la request.
 */
export function auditTrail(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) return next();

  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0];
    const user = req.user;
    AuditLog.create({
      userId: user?.sub,
      userEmail: user?.email,
      role: user?.role,
      action: `${req.method} ${path}`,
      method: req.method,
      path,
      statusCode: res.statusCode,
      ip: req.ip,
    }).catch((err) => logger.error('No se pudo escribir el audit log:', err));
  });

  next();
}
