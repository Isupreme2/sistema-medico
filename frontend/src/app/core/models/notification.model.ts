export type NotificationType =
  | 'cita_reservada'
  | 'cita_cancelada'
  | 'recordatorio'
  | 'consulta_registrada'
  | 'receta_emitida'
  | 'sistema';

export interface AppNotification {
  _id: string;
  userId: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  link?: string;
  leida: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Ícono por tipo, para la UI. */
export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  cita_reservada: '📅',
  cita_cancelada: '❌',
  recordatorio: '⏰',
  consulta_registrada: '🩺',
  receta_emitida: '💊',
  sistema: '🔔',
};
