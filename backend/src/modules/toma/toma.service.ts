import { Toma, TomaEstado, IToma } from '../../models/toma.model';
import { IPrescription } from '../../models/prescription.model';
import { NotificationType } from '../../models/notification.model';
import { User, IUser } from '../../models/user.model';
import { notify } from '../notification/notification.service';
import { momentoLabel } from '../../constants/medicationForms';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import { UserRole } from '../../constants/roles';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { sendWhatsappText } from '../../utils/whatsapp';
import { urlLinkReceta } from '../../utils/recetaLink';
import { calcularTomas } from './toma.schedule';

/**
 * Materializa las tomas de una receta recién emitida. Los medicamentos "según
 * necesidad" (PRN) no se agendan. Best-effort: nunca lanza para no romper la
 * emisión de la receta.
 */
export async function generarTomasDeReceta(receta: IPrescription): Promise<number> {
  try {
    const inicio = receta.inicioTratamiento ?? receta.emitidaEn;
    const docs = receta.medicamentos.flatMap((m, medIndex) => {
      if (m.segunNecesidad || !m.horas?.length || !m.dias) return [];
      return calcularTomas(inicio, m.horas, m.dias).map((programadaEn) => ({
        recetaId: receta._id,
        pacienteId: receta.pacienteId,
        medIndex,
        codigoReceta: receta.codigo,
        medicamento: m.nombre,
        concentracion: m.concentracion,
        cantidad: m.cantidad,
        unidad: m.unidad,
        momento: m.momento,
        indicaciones: receta.indicaciones,
        programadaEn,
        estado: TomaEstado.PENDIENTE,
      }));
    });

    if (docs.length === 0) return 0;
    await Toma.insertMany(docs, { ordered: false });
    return docs.length;
  } catch (err) {
    logger.error('No se pudieron generar las tomas de la receta:', err);
    return 0;
  }
}

/** Redacta el mensaje del recordatorio a partir de la toma. */
function mensajeToma(t: {
  medicamento: string;
  concentracion?: string;
  cantidad?: string;
  unidad?: string;
  momento?: string;
  programadaEn: Date;
}, ahoraMs: number): string {
  const minutos = Math.max(0, Math.round((t.programadaEn.getTime() - ahoraMs) / 60000));
  const cuando = minutos <= 0 ? 'ahora' : `en ${minutos} min`;
  const dosis = [t.cantidad, t.unidad].filter(Boolean).join(' ').trim();
  const conc = t.concentracion ? ` ${t.concentracion}` : '';
  const mom = momentoLabel(t.momento) ? ` (${momentoLabel(t.momento)})` : '';
  return `💊 ${cuando}: toma ${dosis ? dosis + ' de ' : ''}${t.medicamento}${conc}${mom}.`;
}

type UserLite = Pick<IUser, 'telefono' | 'notificarWhatsapp'> | null;

/**
 * Envía el recordatorio de toma por WhatsApp si el paciente activó el canal y
 * tiene teléfono. Incluye las indicaciones generales y un enlace firmado a la
 * receta completa. Best-effort: nunca lanza. `cache` evita repetir la consulta
 * del usuario dentro de la misma corrida del worker.
 */
async function enviarWhatsappToma(
  t: IToma,
  ahoraMs: number,
  cache: Map<string, UserLite>,
): Promise<void> {
  const key = t.pacienteId.toString();
  let user = cache.get(key);
  if (user === undefined) {
    user = (await User.findById(t.pacienteId).select('telefono notificarWhatsapp').lean()) as UserLite;
    cache.set(key, user);
  }
  if (!user || !user.notificarWhatsapp || !user.telefono) return;

  const indicaciones = t.indicaciones ? `\n📋 Indicaciones: ${t.indicaciones}` : '';
  const link = urlLinkReceta(t.recetaId.toString());
  const body = `${mensajeToma(t, ahoraMs)}${indicaciones}\n\n🔗 Ver tu receta completa: ${link}`;
  await sendWhatsappText({ to: user.telefono, body });
}

/**
 * Recorre las tomas próximas y dispara su recordatorio in-app. Idempotente: cada
 * toma se "reclama" atómicamente (pendiente → enviada) antes de notificar, así
 * dos ejecuciones solapadas no la envían dos veces. Las tomas cuya hora ya pasó
 * hace más del margen se marcan como omitidas sin avisar.
 */
export async function runTomaRemindersOnce(now = new Date()): Promise<number> {
  const ahoraMs = now.getTime();
  const leadMs = env.TOMA_LEAD_MIN * 60_000;
  const graceMs = env.TOMA_GRACE_MIN * 60_000;

  // 1) Tomas vencidas hace rato → omitidas (sin notificar).
  await Toma.updateMany(
    { estado: TomaEstado.PENDIENTE, programadaEn: { $lt: new Date(ahoraMs - graceMs) } },
    { $set: { estado: TomaEstado.OMITIDA } },
  );

  // 2) Tomas dentro de la ventana de aviso.
  const candidatas = await Toma.find({
    estado: TomaEstado.PENDIENTE,
    programadaEn: { $gte: new Date(ahoraMs - graceMs), $lte: new Date(ahoraMs + leadMs) },
  })
    .sort({ programadaEn: 1 })
    .limit(200);

  const userCache = new Map<string, UserLite>();
  let enviados = 0;
  for (const t of candidatas) {
    const claimed = await Toma.findOneAndUpdate(
      { _id: t._id, estado: TomaEstado.PENDIENTE },
      { $set: { estado: TomaEstado.ENVIADA, enviadaEn: new Date() } },
      { new: true },
    );
    if (!claimed) continue; // otro tick la tomó

    // Canal 1: notificación in-app (siempre).
    await notify({
      usuarioId: t.pacienteId.toString(),
      tipo: NotificationType.RECORDATORIO_TOMA,
      titulo: 'Hora de tu medicamento',
      mensaje: mensajeToma(t, ahoraMs),
      enlace: '/paciente/mis-recetas',
    });
    // Canal 2: WhatsApp (si el paciente lo activó y tiene teléfono).
    await enviarWhatsappToma(claimed, ahoraMs, userCache);
    enviados += 1;
  }

  if (enviados > 0) logger.info(`💊 Recordatorios de toma enviados: ${enviados}`);
  return enviados;
}

/** Próximas tomas del paciente (por defecto, las siguientes 48 h). */
export async function listProximas(pacienteId: string, horas = 48) {
  const ahora = Date.now();
  return Toma.find({
    pacienteId,
    programadaEn: { $gte: new Date(ahora - 60 * 60_000), $lte: new Date(ahora + horas * 60 * 60_000) },
  })
    .sort({ programadaEn: 1 })
    .limit(60);
}

/** El paciente marca una toma como confirmada (adherencia). */
export async function confirmarToma(id: string, requester: AccessTokenPayload) {
  const toma = await Toma.findById(id);
  if (!toma) throw AppError.notFound('Toma no encontrada');
  if (requester.role === UserRole.PACIENTE && toma.pacienteId.toString() !== requester.sub) {
    throw AppError.forbidden('No puedes modificar esta toma');
  }
  toma.estado = TomaEstado.CONFIRMADA;
  await toma.save();
  return toma;
}
