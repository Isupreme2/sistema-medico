import cron, { ScheduledTask } from 'node-cron';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { NotificationType } from '../models/notification.model';
import { notify } from '../modules/notification/notification.service';
import { sendMail, emailLayout, mailerMode } from '../utils/mailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface PersonaRef {
  _id: { toString(): string };
  nombre: string;
  apellido: string;
  email: string;
}

const fmtFecha = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Lima',
});

/**
 * Busca las citas reservadas dentro de la ventana configurada que aún no
 * recibieron recordatorio, avisa al paciente (email + notificación in-app)
 * y marca la cita para no repetir el envío.
 */
export async function runRemindersOnce(): Promise<number> {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + env.REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const citas = await Appointment.find({
    estado: AppointmentStatus.RESERVADA,
    recordatorioEnviado: false,
    fechaHora: { $gte: ahora, $lte: limite },
  })
    .populate('pacienteId', 'nombre apellido email')
    .populate('medicoId', 'nombre apellido email');

  let enviados = 0;

  for (const cita of citas) {
    const paciente = cita.pacienteId as unknown as PersonaRef;
    const medico = cita.medicoId as unknown as PersonaRef;
    if (!paciente?.email) continue;

    const cuando = fmtFecha.format(cita.fechaHora);
    const titulo = 'Recordatorio de tu cita médica';
    const mensaje = `Tienes una cita con el Dr(a). ${medico.nombre} ${medico.apellido} el ${cuando}.`;

    await sendMail({
      to: paciente.email,
      subject: titulo,
      text: `Hola ${paciente.nombre}, ${mensaje}`,
      html: emailLayout(
        titulo,
        `<p>Hola <strong>${paciente.nombre}</strong>,</p>
         <p>${mensaje}</p>
         <p>Si no puedes asistir, por favor cancela o reprograma tu cita con anticipación
         desde tu portal:</p>
         <p><a href="${env.FRONTEND_URL}/paciente/mis-citas"
            style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
            padding:10px 18px;border-radius:8px;">Ver mis citas</a></p>`,
      ),
    });

    await notify({
      usuarioId: paciente._id.toString(),
      tipo: NotificationType.RECORDATORIO,
      titulo,
      mensaje,
      enlace: '/paciente/mis-citas',
    });

    cita.recordatorioEnviado = true;
    await cita.save();
    enviados += 1;
  }

  if (enviados > 0) {
    logger.info(`⏰ Recordatorios enviados: ${enviados}`);
  }
  return enviados;
}

/** Margen tras el fin de la cita antes de darla por no realizada (minutos). */
const EXPIRY_GRACE_MIN = 60;

/**
 * Cierra las citas que quedaron en estado 'reservada' después de su hora
 * (+ margen) sin atenderse: las marca 'vencida' y avisa al paciente. Cubre el
 * caso en que el médico no se presenta y nadie cerró la cita.
 */
export async function runExpiryOnce(): Promise<number> {
  const ahora = Date.now();
  const citas = await Appointment.find({
    estado: AppointmentStatus.RESERVADA,
    fechaHora: { $lt: new Date(ahora) },
  }).populate('medicoId', 'nombre apellido');

  let cerradas = 0;
  for (const cita of citas) {
    const finConMargen =
      cita.fechaHora.getTime() + cita.duracionMin * 60_000 + EXPIRY_GRACE_MIN * 60_000;
    if (ahora <= finConMargen) continue;

    cita.estado = AppointmentStatus.VENCIDA;
    await cita.save();
    cerradas += 1;

    const cuando = fmtFecha.format(cita.fechaHora);
    await notify({
      usuarioId: cita.pacienteId.toString(),
      tipo: NotificationType.SISTEMA,
      titulo: 'Cita no realizada',
      mensaje: `Tu cita del ${cuando} no se registró como atendida. Si ya la pagaste, puedes solicitar el reembolso desde "Mis citas".`,
      enlace: '/paciente/mis-citas',
    });
  }

  if (cerradas > 0) logger.info(`🗓️ Citas marcadas como vencidas: ${cerradas}`);
  return cerradas;
}

let task: ScheduledTask | null = null;

/** Programa el job de recordatorios según REMINDER_CRON. */
export function startReminderJob(): void {
  if (!env.REMINDERS_ENABLED) {
    logger.warn('⏰ Recordatorios deshabilitados (REMINDERS_ENABLED=false)');
    return;
  }
  if (!cron.validate(env.REMINDER_CRON)) {
    logger.error(`⏰ REMINDER_CRON inválido: "${env.REMINDER_CRON}", job no programado`);
    return;
  }

  task = cron.schedule(env.REMINDER_CRON, () => {
    runRemindersOnce().catch((err) => logger.error('Fallo en el job de recordatorios:', err));
    runExpiryOnce().catch((err) => logger.error('Fallo al cerrar citas vencidas:', err));
  });

  logger.info(
    `⏰ Job de recordatorios activo (cron="${env.REMINDER_CRON}", ventana=${env.REMINDER_WINDOW_HOURS}h, correo=${mailerMode()})`,
  );
}

/** Detiene el job (apagado ordenado / tests). */
export function stopReminderJob(): void {
  task?.stop();
  task = null;
}
