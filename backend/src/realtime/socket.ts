import { Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { corsOrigin } from '../config/cors';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

let io: IOServer | null = null;

/** Inicializa Socket.io sobre el servidor HTTP. */
export function initSocket(server: HttpServer): void {
  io = new IOServer(server, {
    cors: { origin: corsOrigin, credentials: true },
  });

  // Autenticación del socket: se exige un access token válido en el handshake.
  // El userId se toma del token (no de lo que diga el cliente), evitando que
  // alguien escuche las notificaciones de otro usuario.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('No autenticado'));
      const payload = verifyAccessToken(token);
      (socket.data as { userId?: string }).userId = payload.sub;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
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

    // Cada usuario escucha SUS notificaciones: la sala se deriva del token,
    // ignorando cualquier id enviado por el cliente.
    const uid = (socket.data as { userId?: string }).userId;
    socket.on('watch:user', () => {
      if (uid) socket.join(`user:${uid}`);
    });
    socket.on('unwatch:user', () => {
      if (uid) socket.leave(`user:${uid}`);
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

/** Empuja una notificación en tiempo real a la sala del usuario destinatario. */
export function emitNotification(userId: string, notification: unknown): void {
  io?.to(`user:${userId}`).emit('notification:new', notification);
}
