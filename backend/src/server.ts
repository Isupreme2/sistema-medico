import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API escuchando en http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`📚 Swagger en       http://localhost:${env.PORT}/docs`);
  });

  // Apagado ordenado (cierra HTTP y la conexión a Mongo)
  const shutdown = async (signal: string) => {
    logger.warn(`${signal} recibido, cerrando...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Fallo al arrancar el servidor:', err);
  process.exit(1);
});
