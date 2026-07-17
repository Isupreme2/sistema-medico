import http from 'node:http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { initSocket } from './realtime/socket';
import { startReminderJob, stopReminderJob } from './jobs/reminders';
import { startTomaReminderJob, stopTomaReminderJob } from './jobs/tomaReminders';
import { env } from './config/env';
import { logger } from './utils/logger';
import { predictionEngine } from './modules/prediction/prediction.engine';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  try {
    await predictionEngine.initialize();
    logger.info('Modelos ONNX cargados correctamente');
  } catch (err) {
    logger.error('Error al cargar modelos ONNX:', err);
  }

  const app = createApp();
  const server = http.createServer(app);

  // Tiempo real (Socket.io) sobre el mismo servidor HTTP
  initSocket(server);

  // Recordatorios de citas (node-cron) — email + notificación in-app
  startReminderJob();

  // Recordatorios de tomas de medicamentos (node-cron) — notificación in-app
  startTomaReminderJob();

  server.listen(env.PORT, () => {
    logger.info(`🚀 API escuchando en http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`📚 Swagger en       http://localhost:${env.PORT}/docs`);
  });

  // Apagado ordenado (cierra HTTP y la conexión a Mongo)
  const shutdown = async (signal: string) => {
    logger.warn(`${signal} recibido, cerrando...`);
    stopReminderJob();
    stopTomaReminderJob();
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
