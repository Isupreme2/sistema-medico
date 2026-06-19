import mongoose from 'mongoose';
import { Appointment, AppointmentStatus } from '../../models/appointment.model';
import { AppointmentType } from '../../models/appointmentType.model';
import { MedicoProfile } from '../../models/medicoProfile.model';
import { Bloqueo } from '../../models/bloqueo.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import { CreateAppointmentInput, UpdateStatusInput } from './appointment.validation';

// ----- Helpers de tiempo -----
const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHmm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Construye un Date a partir de "YYYY-MM-DD" + "HH:mm" (hora local del servidor). */
const buildDate = (fecha: string, hhmm: string): Date => new Date(`${fecha}T${hhmm}:00`);

export interface Slot {
  hora: string; // "HH:mm"
  fechaHora: string; // ISO
  disponible: boolean;
}

/**
 * Genera la disponibilidad de un médico para una fecha:
 * franjas del día − citas reservadas − bloqueos − slots en el pasado.
 */
export async function getAvailability(medicoId: string, fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw AppError.badRequest('Fecha inválida (usar YYYY-MM-DD)');
  }

  const profile = await MedicoProfile.findOne({ userId: medicoId });
  if (!profile) throw AppError.notFound('Médico no encontrado');

  const diaSemana = buildDate(fecha, '00:00').getDay();
  const franjas = profile.horarios.filter((h) => h.diaSemana === diaSemana);
  const dur = profile.duracionSlotMin;

  const dayStart = buildDate(fecha, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Citas reservadas de ese día
  const reservadas = await Appointment.find({
    medicoId,
    estado: AppointmentStatus.RESERVADA,
    fechaHora: { $gte: dayStart, $lt: dayEnd },
  });
  const ocupados = new Set(reservadas.map((a) => a.fechaHora.getTime()));

  // Bloqueos que solapan el día
  const bloqueos = await Bloqueo.find({
    medicoId,
    desde: { $lt: dayEnd },
    hasta: { $gt: dayStart },
  });

  const ahora = Date.now();
  const slots: Slot[] = [];

  for (const franja of franjas) {
    const inicio = toMinutes(franja.horaInicio);
    const fin = toMinutes(franja.horaFin);
    for (let min = inicio; min + dur <= fin; min += dur) {
      const hora = toHHmm(min);
      const fechaHora = buildDate(fecha, hora);
      const t = fechaHora.getTime();

      const enBloqueo = bloqueos.some(
        (b) => t < b.hasta.getTime() && t + dur * 60_000 > b.desde.getTime(),
      );
      const disponible = !ocupados.has(t) && !enBloqueo && t > ahora;

      slots.push({ hora, fechaHora: fechaHora.toISOString(), disponible });
    }
  }

  slots.sort((a, b) => a.hora.localeCompare(b.hora));
  return { fecha, medicoId, duracionSlotMin: dur, slots };
}

/**
 * Reserva una cita de forma ATÓMICA.
 * No hace "chequeo previo": intenta insertar y deja que el índice único
 * de la base de datos sea el árbitro (error 11000 → 409 Conflict).
 */
export async function reservar(pacienteId: string, input: CreateAppointmentInput) {
  const profile = await MedicoProfile.findOne({ userId: input.medicoId });
  if (!profile || !profile.activo) {
    throw AppError.notFound('Médico no disponible');
  }

  const fechaHora = input.fechaHora;
  if (fechaHora.getTime() <= Date.now()) {
    throw AppError.badRequest('No puedes reservar en el pasado');
  }

  // Duración: del tipo de cita si se indica, si no la del slot del médico
  let duracionMin = profile.duracionSlotMin;
  if (input.appointmentTypeId) {
    const tipo = await AppointmentType.findById(input.appointmentTypeId);
    if (tipo) duracionMin = tipo.duracionMin;
  }

  // Validación de que el slot cae dentro de una franja de atención
  const diaSemana = fechaHora.getDay();
  const minutos = fechaHora.getHours() * 60 + fechaHora.getMinutes();
  const dentroDeFranja = profile.horarios.some(
    (h) =>
      h.diaSemana === diaSemana &&
      minutos >= toMinutes(h.horaInicio) &&
      minutos + duracionMin <= toMinutes(h.horaFin),
  );
  if (!dentroDeFranja) {
    throw AppError.unprocessable('Ese horario no está dentro de la atención del médico');
  }

  // Bloqueos
  const t = fechaHora.getTime();
  const enBloqueo = await Bloqueo.exists({
    medicoId: input.medicoId,
    desde: { $lt: new Date(t + duracionMin * 60_000) },
    hasta: { $gt: fechaHora },
  });
  if (enBloqueo) throw AppError.conflict('Ese horario está bloqueado');

  try {
    const cita = await Appointment.create({
      medicoId: input.medicoId,
      pacienteId,
      appointmentTypeId: input.appointmentTypeId,
      fechaHora,
      duracionMin,
      motivo: input.motivo,
    });
    return cita.populate([
      { path: 'medicoId', select: 'nombre apellido' },
      { path: 'pacienteId', select: 'nombre apellido' },
      { path: 'appointmentTypeId', select: 'nombre color' },
    ]);
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw AppError.conflict('Ese horario acaba de ser reservado, elige otro');
    }
    throw err;
  }
}

/** Lista citas filtradas por el rol del solicitante. */
export async function listAppointments(
  requester: AccessTokenPayload,
  filters: { desde?: string; hasta?: string; medicoId?: string },
) {
  const query: mongoose.FilterQuery<typeof Appointment> = {};

  if (requester.role === UserRole.PACIENTE) {
    query.pacienteId = requester.sub;
  } else if (requester.role === UserRole.MEDICO) {
    query.medicoId = requester.sub;
  } else if (filters.medicoId) {
    query.medicoId = filters.medicoId;
  }

  if (filters.desde || filters.hasta) {
    query.fechaHora = {};
    if (filters.desde) query.fechaHora.$gte = new Date(filters.desde);
    if (filters.hasta) query.fechaHora.$lte = new Date(filters.hasta);
  }

  return Appointment.find(query)
    .populate('medicoId', 'nombre apellido')
    .populate('pacienteId', 'nombre apellido')
    .populate('appointmentTypeId', 'nombre color')
    .sort({ fechaHora: 1 });
}

async function getOwnedAppointment(id: string, requester: AccessTokenPayload) {
  const cita = await Appointment.findById(id);
  if (!cita) throw AppError.notFound('Cita no encontrada');

  const esAdmin = requester.role === UserRole.ADMIN;
  const esMedico =
    requester.role === UserRole.MEDICO && cita.medicoId.toString() === requester.sub;
  const esPaciente =
    requester.role === UserRole.PACIENTE && cita.pacienteId.toString() === requester.sub;

  if (!esAdmin && !esMedico && !esPaciente) {
    throw AppError.forbidden('No puedes gestionar esta cita');
  }
  return cita;
}

/** Cancela una cita (libera el slot al salir de estado 'reservada'). */
export async function cancelar(id: string, requester: AccessTokenPayload) {
  const cita = await getOwnedAppointment(id, requester);
  if (cita.estado !== AppointmentStatus.RESERVADA) {
    throw AppError.conflict('Solo se pueden cancelar citas reservadas');
  }
  cita.estado = AppointmentStatus.CANCELADA;
  await cita.save();
  return cita;
}

/** El médico marca la cita como atendida o no-asistió. */
export async function actualizarEstado(
  id: string,
  requester: AccessTokenPayload,
  input: UpdateStatusInput,
) {
  const cita = await getOwnedAppointment(id, requester);
  cita.estado = input.estado;
  await cita.save();
  return cita;
}
