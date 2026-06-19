import http from 'node:http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { initSocket } from './realtime/socket';
import { startReminderJob, stopReminderJob } from './jobs/reminders';
import { env } from './config/env';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  // Tiempo real (Socket.io) sobre el mismo servidor HTTP
  initSocket(server);

  // Recordatorios de citas (node-cron) — email + notificación in-app
  startReminderJob();

  server.listen(env.PORT, () => {
    logger.info(`🚀 API escuchando en http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`📚 Swagger en       http://localhost:${env.PORT}/docs`);
  });

  // Apagado ordenado (cierra HTTP y la conexión a Mongo)
  const shutdown = async (signal: string) => {
    logger.warn(`${signal} recibido, cerrando...`);
    stopReminderJob();
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
