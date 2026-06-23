import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Valida body/query/params contra un esquema Zod.
 * Reemplaza los valores con la versión parseada (tipos coercionados, defaults).
 */
export const validate =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body) req.body = parsed.body;
      // query y params son de solo-lectura en algunas versiones; se mantienen los originales validados
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.flatten().fieldErrors;
        // Mensaje legible: el primer error concreto (las reglas de Zod ya están
        // en español), para que el usuario sepa qué corregir y no solo vea "Error
        // de validación". El detalle completo por campo va en `details`.
        const primer = err.issues[0];
        const mensaje = primer?.message ?? 'Error de validación';
        throw AppError.unprocessable(mensaje, details);
      }
      throw err;
    }
  };
