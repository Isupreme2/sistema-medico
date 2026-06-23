import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';

import { env, isProd } from './config/env';
import { corsOrigin } from './config/cors';
import { swaggerSpec } from './config/swagger';
import apiRoutes from './routes';
import { auditTrail } from './middleware/audit';
import { notFoundHandler, errorHandler } from './middleware/error';

export function createApp(): Application {
  const app = express();

  // En producción la app corre detrás de un proxy (Render, etc.). Esto hace que
  // Express confíe en X-Forwarded-* para obtener la IP real del cliente
  // (auditoría, rate-limit) y reconocer que la conexión original es HTTPS.
  if (isProd) app.set('trust proxy', 1);

  // --- Seguridad / hardening ---
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );

  // --- Parsers ---
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // --- Sanitización anti NoSQL-injection ($, .) ---
  app.use(mongoSanitize());

  // --- Logging de requests ---
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // --- Auditoría (registra acciones que modifican datos) ---
  app.use(env.API_PREFIX, auditTrail);

  // --- Documentación (Swagger UI) ---
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

  // --- Rutas del API ---
  app.use(env.API_PREFIX, apiRoutes);

  // --- 404 + manejador global de errores (siempre al final) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
