import { Notification, NotificationType } from '../../models/notification.model';
import { emitNotification } from '../../realtime/socket';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { AccessTokenPayload } from '../../utils/jwt';

export interface NotifyInput {
  userId: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  link?: string;
}

/**
 * Crea una notificación in-app y la empuja por Socket.io a la sala del usuario.
 * Nunca lanza: una notificación es un efecto secundario y no debe romper el
 * flujo de negocio que la dispara (reserva, receta, etc.).
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const noti = await Notification.create(input);
    emitNotification(input.userId, noti.toJSON());
  } catch (err) {
    logger.error('No se pudo crear la notificación:', err);
  }
}

/** Lista las notificaciones del usuario autenticado (recientes primero). */
export async function listMine(userId: string, soloNoLeidas = false) {
  const query: Record<string, unknown> = { userId };
  if (soloNoLeidas) query.leida = false;
  return Notification.find(query).sort({ createdAt: -1 }).limit(50);
}

export async function unreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, leida: false });
}

export async function markRead(id: string, requester: AccessTokenPayload) {
  const noti = await Notification.findById(id);
  if (!noti) throw AppError.notFound('Notificación no encontrada');
  if (noti.userId.toString() !== requester.sub) {
    throw AppError.forbidden('No puedes modificar esta notificación');
  }
  noti.leida = true;
  await noti.save();
  return noti;
}

export async function markAllRead(userId: string): Promise<number> {
  const res = await Notification.updateMany(
    { userId, leida: false },
    { $set: { leida: true } },
  );
  return res.modifiedCount;
}
