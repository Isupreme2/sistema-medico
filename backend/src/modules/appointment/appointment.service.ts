import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  Appointment,
  AppointmentStatus,
  AppointmentModality,
} from '../../models/appointment.model';
import { AppointmentType } from '../../models/appointmentType.model';
import { MedicoProfile } from '../../models/medicoProfile.model';
import { Bloqueo } from '../../models/bloqueo.model';
import { PreConsulta } from '../../models/preConsulta.model';
import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import { env } from '../../config/env';
import {
  CreateAppointmentInput,
  UpdateStatusInput,
  PreConsultaInput,
} from './appointment.validation';
import { buildDate, computeSlots, dentroDeFranja } from '../../utils/slots';
import { notify } from '../notification/notification.service';
import { NotificationType } from '../../models/notification.model';

/** Minutos antes/después de la cita en que la sala de teleconsulta está activa. */
const VIDEO_ANTES_MIN = 10;
const VIDEO_DESPUES_MIN = 30;

const fmtCita = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

interface PersonaPop {
  _id: { toString(): string };
  nombre: string;
  apellido: string;
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

  const slots = computeSlots({
    fecha,
    franjasDelDia: franjas,
    duracionSlotMin: dur,
    ocupados,
    bloqueos,
    ahora: Date.now(),
  });

  return { fecha, medicoId, duracionSlotMin: dur, slots };
}

/**
 * Reserva una cita de forma ATÓMICA.
 * No hace "chequeo previo": intenta insertar y deja que el índice único
 * de la base de datos sea el árbitro (error 11000 → 409 Conflict).
 */
export async function reservar(requester: AccessTokenPayload, input: CreateAppointmentInput) {
  // ¿A nombre de quién es la cita?
  //  - Paciente: siempre para sí mismo (no puede agendar a terceros).
  //  - Recepción/Admin: para el paciente indicado en el body.
  let pacienteId: string;
  if (requester.role === UserRole.PACIENTE) {
    pacienteId = requester.sub;
  } else {
    if (!input.pacienteId) {
      throw AppError.badRequest('Debes indicar el paciente para el que se agenda la cita');
    }
    const paciente = await User.findById(input.pacienteId);
    if (!paciente || paciente.role !== UserRole.PACIENTE) {
      throw AppError.notFound('Paciente no encontrado');
    }
    pacienteId = input.pacienteId;
  }

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
  if (!dentroDeFranja(diaSemana, minutos, duracionMin, profile.horarios)) {
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

  // En teleconsulta generamos una sala de video única e impredecible
  const esTeleconsulta = input.modalidad === AppointmentModality.TELECONSULTA;
  const videoRoom = esTeleconsulta
    ? `EHR-${crypto.randomBytes(12).toString('hex')}`
    : undefined;

  try {
    const cita = await Appointment.create({
      medicoId: input.medicoId,
      pacienteId,
      appointmentTypeId: input.appointmentTypeId,
      fechaHora,
      duracionMin,
      modalidad: input.modalidad,
      videoRoom,
      motivo: input.motivo,
    });
    const populated = await cita.populate([
      { path: 'medicoId', select: 'nombre apellido' },
      { path: 'pacienteId', select: 'nombre apellido' },
      { path: 'appointmentTypeId', select: 'nombre color' },
    ]);

    // Avisar al médico de la nueva reserva
    const paciente = populated.pacienteId as unknown as PersonaPop;
    await notify({
      userId: input.medicoId,
      tipo: NotificationType.CITA_RESERVADA,
      titulo: 'Nueva cita reservada',
      mensaje: `${paciente.nombre} ${paciente.apellido} reservó para el ${fmtCita.format(populated.fechaHora)}.`,
      link: '/medico/agenda',
    });

    return populated;
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

  // Admin y Recepción gestionan cualquier cita; médico/paciente solo las suyas.
  const esGestor =
    requester.role === UserRole.ADMIN || requester.role === UserRole.RECEPCIONISTA;
  const esMedico =
    requester.role === UserRole.MEDICO && cita.medicoId.toString() === requester.sub;
  const esPaciente =
    requester.role === UserRole.PACIENTE && cita.pacienteId.toString() === requester.sub;

  if (!esGestor && !esMedico && !esPaciente) {
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

  // Notificar a la contraparte: si cancela el paciente, avisar al médico; si
  // cancela el médico/admin, avisar al paciente.
  await cita.populate([
    { path: 'medicoId', select: 'nombre apellido' },
    { path: 'pacienteId', select: 'nombre apellido' },
  ]);
  const medico = cita.medicoId as unknown as PersonaPop;
  const paciente = cita.pacienteId as unknown as PersonaPop;
  const cuando = fmtCita.format(cita.fechaHora);

  if (requester.role === UserRole.PACIENTE) {
    await notify({
      userId: medico._id.toString(),
      tipo: NotificationType.CITA_CANCELADA,
      titulo: 'Cita cancelada',
      mensaje: `${paciente.nombre} ${paciente.apellido} canceló su cita del ${cuando}.`,
      link: '/medico/agenda',
    });
  } else {
    await notify({
      userId: paciente._id.toString(),
      tipo: NotificationType.CITA_CANCELADA,
      titulo: 'Tu cita fue cancelada',
      mensaje: `Tu cita del ${cuando} fue cancelada. Puedes reprogramarla cuando quieras.`,
      link: '/paciente/reservar',
    });
  }

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

/**
 * Devuelve los datos para entrar a la sala de teleconsulta, validando que el
 * solicitante sea participante y que esté dentro de la ventana horaria. No
 * lanza por "es muy temprano/tarde": devuelve canJoin=false + motivo para que
 * el front muestre el estado de la sala.
 */
export async function getVideoAccess(id: string, requester: AccessTokenPayload) {
  const cita = await getOwnedAppointment(id, requester);
  if (cita.modalidad !== AppointmentModality.TELECONSULTA || !cita.videoRoom) {
    throw AppError.unprocessable('Esta cita no es una teleconsulta');
  }

  await cita.populate([
    { path: 'medicoId', select: 'nombre apellido' },
    { path: 'pacienteId', select: 'nombre apellido' },
  ]);
  const medico = cita.medicoId as unknown as PersonaPop;
  const paciente = cita.pacienteId as unknown as PersonaPop;
  // El paciente es quien coincide con pacienteId; cualquier otro (médico/admin)
  // entra con la identidad del médico.
  const soyMedico = requester.sub !== paciente._id.toString();

  const yo = soyMedico ? medico : paciente;
  const contraparte = soyMedico
    ? `${paciente.nombre} ${paciente.apellido}`
    : `Dr(a). ${medico.nombre} ${medico.apellido}`;

  const inicio = cita.fechaHora.getTime();
  const fin = inicio + cita.duracionMin * 60_000;
  const ahora = Date.now();

  let canJoin = true;
  let motivo = '';
  if (cita.estado === AppointmentStatus.CANCELADA) {
    canJoin = false;
    motivo = 'La cita fue cancelada.';
  } else if (ahora < inicio - VIDEO_ANTES_MIN * 60_000) {
    canJoin = false;
    motivo = `La sala se habilita ${VIDEO_ANTES_MIN} minutos antes de la cita.`;
  } else if (ahora > fin + VIDEO_DESPUES_MIN * 60_000) {
    canJoin = false;
    motivo = 'La teleconsulta ya finalizó.';
  }

  return {
    canJoin,
    motivo,
    room: cita.videoRoom,
    domain: env.JITSI_DOMAIN,
    displayName: `${yo.nombre} ${yo.apellido}`,
    contraparte,
    inicio: cita.fechaHora,
    fin: new Date(fin),
    estado: cita.estado,
  };
}

/** El paciente dueño envía/actualiza su formulario de pre-consulta. */
export async function submitPreConsulta(
  id: string,
  requester: AccessTokenPayload,
  input: PreConsultaInput,
) {
  const cita = await getOwnedAppointment(id, requester);
  if (
    requester.role !== UserRole.PACIENTE ||
    cita.pacienteId.toString() !== requester.sub
  ) {
    throw AppError.forbidden('Solo el paciente de la cita puede llenar la pre-consulta');
  }

  const form = await PreConsulta.findOneAndUpdate(
    { appointmentId: cita._id },
    {
      ...input,
      appointmentId: cita._id,
      pacienteId: cita.pacienteId,
      medicoId: cita.medicoId,
      enviadoEn: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await notify({
    userId: cita.medicoId.toString(),
    tipo: NotificationType.SISTEMA,
    titulo: 'Formulario pre-consulta recibido',
    mensaje: 'Un paciente completó su formulario previo a la cita.',
    link: '/medico/agenda',
  });

  return form;
}

/** Obtiene la pre-consulta de una cita (médico de la cita, paciente dueño o admin). */
export async function getPreConsulta(id: string, requester: AccessTokenPayload) {
  await getOwnedAppointment(id, requester); // valida propiedad/rol
  return PreConsulta.findOne({ appointmentId: id });
}
