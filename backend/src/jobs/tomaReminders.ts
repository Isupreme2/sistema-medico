import cron, { ScheduledTask } from 'node-cron';
import { runTomaRemindersOnce } from '../modules/toma/toma.service';
import { whatsappMode } from '../utils/whatsapp';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let task: ScheduledTask | null = null;

/**
 * Programa el worker de recordatorios de tomas de medicamentos. Corre con más
 * frecuencia que el de citas (por defecto cada minuto) para acertar la ventana
 * del "en 5 minutos".
 *
 * Nota de despliegue: en planes que suspenden el proceso por inactividad
 * (ej. Render free tier) el cron no corre mientras el servicio duerme; para
 * recordatorios fiables conviene un scheduler externo que despierte al backend.
 */
export function startTomaReminderJob(): void {
  if (!env.REMINDERS_ENABLED) return; // ya se avisa en el job de citas
  if (!cron.validate(env.TOMA_REMINDER_CRON)) {
    logger.error(`💊 TOMA_REMINDER_CRON inválido: "${env.TOMA_REMINDER_CRON}", worker no programado`);
    return;
  }

  task = cron.schedule(env.TOMA_REMINDER_CRON, () => {
    runTomaRemindersOnce().catch((err) =>
      logger.error('Fallo en el worker de recordatorios de toma:', err),
    );
  });

  logger.info(
    `💊 Worker de tomas activo (cron="${env.TOMA_REMINDER_CRON}", aviso=${env.TOMA_LEAD_MIN} min antes, whatsapp=${whatsappMode()})`,
  );
}

/** Detiene el worker (apagado ordenado / tests). */
export function stopTomaReminderJob(): void {
  task?.stop();
  task = null;
}
