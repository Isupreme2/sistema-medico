import { AccessTokenPayload } from '../../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Usuario autenticado, inyectado por el middleware authenticate. */
      user?: AccessTokenPayload;
    }

    interface Locals {
      /**
       * Identidad alternativa para rutas sin autenticación middleware
       * (register, login). El controller lo setea antes de responder.
       */
      auditUser?: AccessTokenPayload;
    }
  }
}

export {};
