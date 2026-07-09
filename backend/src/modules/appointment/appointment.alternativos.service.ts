import { MedicoProfile } from '../../models/medicoProfile.model';
import { Appointment, AppointmentStatus } from '../../models/appointment.model';
import { Bloqueo } from '../../models/bloqueo.model';
import { computeSlots, enHoraClinica, buildDate } from '../../utils/slots';
import { Slot } from '../../utils/slots';

export interface MedicoAlternativo {
  _id: string;
  usuarioId: {
    _id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  especialidad: string;
  numeroColegiatura: string;
  duracionSlotMin: number;
  activo: boolean;
}

export interface AlternativoConSlots {
  medico: MedicoAlternativo;
  slots: Slot[];
  coincideHora: boolean;
}

export interface AlternativosResponse {
  especialidad: string;
  coincideHora: boolean;
  alternativos: AlternativoConSlots[];
  especialidadAlternativa?: {
    especialidad: string;
    alternativos: AlternativoConSlots[];
  };
}

async function getMedicoProfile(userId: string) {
  const profile = await MedicoProfile.findOne({ usuarioId: userId })
    .populate('usuarioId', 'nombre apellido email activo');
  if (!profile) return null;
  const u = profile.usuarioId as unknown as { _id: string; nombre: string; apellido: string; email: string };
  return {
    _id: profile._id.toString(),
    usuarioId: { _id: u._id.toString(), nombre: u.nombre, apellido: u.apellido, email: u.email },
    especialidad: profile.especialidad,
    numeroColegiatura: profile.numeroColegiatura,
    duracionSlotMin: profile.duracionSlotMin,
    activo: profile.activo,
  };
}

async function computeAvailabilityForDoctor(
  medicoUserId: string,
  fecha: string,
  hora?: string,
): Promise<{ slots: Slot[]; coincideHora: boolean } | null> {
  const profile = await MedicoProfile.findOne({ usuarioId: medicoUserId, activo: true });
  if (!profile) return null;

  const diaSemana = enHoraClinica(buildDate(fecha, '00:00')).diaSemana;
  const franjas = profile.horarios.filter((h) => h.diaSemana === diaSemana);
  if (franjas.length === 0) return { slots: [], coincideHora: false };

  const dur = profile.duracionSlotMin;
  const dayStart = buildDate(fecha, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const reservadas = await Appointment.find({
    medicoId: medicoUserId,
    estado: AppointmentStatus.RESERVADA,
    fechaHora: { $gte: dayStart, $lt: dayEnd },
  });
  const ocupados = new Set(reservadas.map((a) => a.fechaHora.getTime()));

  const bloqueos = await Bloqueo.find({
    medicoId: medicoUserId,
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

  let coincideHora = false;
  if (hora) {
    coincideHora = slots.some((s) => s.hora === hora && s.disponible);
  }

  return { slots, coincideHora };
}

export async function findAlternatives(
  medicoId: string,
  fecha: string,
  hora?: string,
): Promise<AlternativosResponse> {
  const reference = await MedicoProfile.findOne({ usuarioId: medicoId });
  if (!reference) {
    return { especialidad: '', coincideHora: false, alternativos: [] };
  }

  const especialidad = reference.especialidad;
  const mismos = await MedicoProfile.find({
    usuarioId: { $ne: medicoId },
    especialidad,
    activo: true,
  });

  const alternativos: AlternativoConSlots[] = [];

  for (const doc of mismos) {
    const result = await computeAvailabilityForDoctor(doc.usuarioId.toString(), fecha, hora);
    if (!result) continue;
    const slotsDisponibles = result.slots.filter((s) => s.disponible);
    if (slotsDisponibles.length === 0 && !hora) continue;

    const medicoProfile = await getMedicoProfile(doc.usuarioId.toString());
    if (!medicoProfile) continue;

    alternativos.push({
      medico: medicoProfile,
      slots: result.slots,
      coincideHora: result.coincideHora,
    });
  }

  const algunCoincide = alternativos.some((a) => a.coincideHora);

  let especialidadAlternativa: { especialidad: string; alternativos: AlternativoConSlots[] } | undefined;

  if (alternativos.length === 0 && especialidad !== 'Medicina General') {
    const generales = await MedicoProfile.find({
      usuarioId: { $ne: medicoId },
      especialidad: 'Medicina General',
      activo: true,
    });

    const altGenerales: AlternativoConSlots[] = [];

    for (const doc of generales) {
      const result = await computeAvailabilityForDoctor(doc.usuarioId.toString(), fecha, hora);
      if (!result) continue;
      const slotsDisponibles = result.slots.filter((s) => s.disponible);
      if (slotsDisponibles.length === 0 && !hora) continue;

      const medicoProfile = await getMedicoProfile(doc.usuarioId.toString());
      if (!medicoProfile) continue;

      altGenerales.push({
        medico: medicoProfile,
        slots: result.slots,
        coincideHora: result.coincideHora,
      });
    }

    if (altGenerales.length > 0) {
      especialidadAlternativa = {
        especialidad: 'Medicina General',
        alternativos: altGenerales,
      };
    }
  }

  return {
    especialidad,
    coincideHora: algunCoincide,
    alternativos,
    especialidadAlternativa,
  };
}
