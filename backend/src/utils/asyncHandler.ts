import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Envuelve handlers async para que cualquier promesa rechazada
 * se reenvíe automáticamente al middleware de error (sin try/catch repetido).
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
