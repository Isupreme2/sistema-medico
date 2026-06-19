import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { isProd } from '../config/env';

/** Handler para rutas no encontradas (404). */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/** Handler global de errores. Debe declararse al final, con 4 argumentos. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Error operacional conocido
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Clave duplicada (índice único) → 409
  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'campo';
    res.status(409).json({
      status: 'error',
      message: `Ya existe un registro con ese ${field}`,
    });
    return;
  }

  // Error de validación de Mongoose → 422
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(422).json({
      status: 'error',
      message: 'Error de validación',
      details: Object.fromEntries(
        Object.entries(err.errors).map(([k, v]) => [k, v.message]),
      ),
    });
    return;
  }

  // Inesperado → 500 (no filtramos detalles en producción)
  logger.error('Error no controlado:', err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    ...(isProd ? {} : { debug: err instanceof Error ? err.message : String(err) }),
  });
}
