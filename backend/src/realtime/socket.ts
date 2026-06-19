import { Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let io: IOServer | null = null;

/** Inicializa Socket.io sobre el servidor HTTP. */
export function initSocket(server: HttpServer): void {
  io = new IOServer(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.on('connection', (socket) => {
    // El cliente se suscribe a los cambios de un médico concreto
    socket.on('watch:medico', (medicoId: string) => {
      if (typeof medicoId === 'string' && medicoId) {
        socket.join(`medico:${medicoId}`);
      }
    });
    socket.on('unwatch:medico', (medicoId: string) => {
      socket.leave(`medico:${medicoId}`);
    });
  });

  logger.info('🔌 Socket.io inicializado');
}

export interface SlotChange {
  medicoId: string;
  fechaHora: string;
  estado: string;
}

/**
 * Notifica a los clientes que observan la agenda de un médico que un slot
 * cambió (reservado o liberado). El front refresca la disponibilidad.
 */
export function emitSlotChange(change: SlotChange): void {
  io?.to(`medico:${change.medicoId}`).emit('appointment:changed', change);
}
