import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../constants/roles';
import { AppError } from '../utils/AppError';

/**
 * RBAC: permite el paso solo si el rol del usuario está en la lista.
 * Uso: router.post('/', authenticate, authorize(UserRole.MEDICO), handler)
 *
 * IMPORTANTE: el rol abre la puerta; la *propiedad* del recurso
 * (ej. "este paciente es mío") se valida en la capa de servicio.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw AppError.forbidden('No tienes permisos para esta acción');
    }
    next();
  };
}
