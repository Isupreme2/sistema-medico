export type NotificationType =
  | 'cita_reservada'
  | 'cita_cancelada'
  | 'recordatorio'
  | 'recordatorio_toma'
  | 'consulta_registrada'
  | 'receta_emitida'
  | 'sistema';

export interface AppNotification {
  _id: string;
  usuarioId: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  enlace?: string;
  leida: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/** Ícono por tipo, para la UI. */
export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  cita_reservada: '📅',
  cita_cancelada: '❌',
  recordatorio: '⏰',
  recordatorio_toma: '💊',
  consulta_registrada: '🩺',
  receta_emitida: '💊',
  sistema: '🔔',
};
