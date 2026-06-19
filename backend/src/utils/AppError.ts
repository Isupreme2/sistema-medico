/**
 * Error operacional con código HTTP. Permite distinguir errores esperados
 * (validación, no encontrado, conflicto) de bugs inesperados en el handler global.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(msg = 'Solicitud inválida', details?: unknown) {
    return new AppError(400, msg, details);
  }
  static unauthorized(msg = 'No autenticado') {
    return new AppError(401, msg);
  }
  static forbidden(msg = 'No autorizado') {
    return new AppError(403, msg);
  }
  static notFound(msg = 'Recurso no encontrado') {
    return new AppError(404, msg);
  }
  static conflict(msg = 'Conflicto con el estado actual del recurso') {
    return new AppError(409, msg);
  }
  static unprocessable(msg = 'Entidad no procesable', details?: unknown) {
    return new AppError(422, msg, details);
  }
}
