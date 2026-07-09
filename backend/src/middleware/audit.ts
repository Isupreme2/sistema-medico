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
    const ruta = req.originalUrl.split('?')[0];
    const auditUser = req.user ?? res.locals.auditUser;
    AuditLog.create({
      usuarioId: auditUser?.sub,
      emailUsuario: auditUser?.email,
      rol: auditUser?.role,
      accion: `${req.method} ${ruta}`,
      metodo: req.method,
      ruta,
      codigoEstado: res.statusCode,
      ip: req.ip,
    }).catch((err) => logger.error('No se pudo escribir el audit log:', err));
  });

  next();
}
