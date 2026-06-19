import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Conecta a MongoDB Atlas. Reintenta el primer fallo y registra eventos clave
 * del ciclo de vida de la conexión.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info(`🗄️  MongoDB conectado (db: ${mongoose.connection.name})`);
  });
  mongoose.connection.on('error', (err) => {
    logger.error('Error de conexión MongoDB:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB desconectado');
  });

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: true, // en producción conviene gestionarlo aparte, en dev es cómodo
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('Conexión MongoDB cerrada');
}
