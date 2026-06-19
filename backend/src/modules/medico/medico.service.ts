import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model';
import { MedicoProfile } from '../../models/medicoProfile.model';
import { Bloqueo } from '../../models/bloqueo.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import {
  CreateMedicoInput,
  UpdateHorarioInput,
  UpdateProfileInput,
  CreateBloqueoInput,
} from './medico.validation';

const BCRYPT_ROUNDS = 12;

/** Verifica que el solicitante sea Admin o el propio médico dueño del recurso. */
function assertAdminOrOwner(requester: AccessTokenPayload, medicoUserId: string): void {
  if (requester.role === UserRole.ADMIN) return;
  if (requester.role === UserRole.MEDICO && requester.sub === medicoUserId) return;
  throw AppError.forbidden('No puedes gestionar la agenda de otro médico');
}

/**
 * Crea un médico: usuario (rol médico) + su perfil, de forma atómica.
 * Si falla la creación del perfil, se revierte el usuario (transacción).
 */
export async function createMedico(input: CreateMedicoInput) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw AppError.conflict('Ya existe una cuenta con ese email');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const session = await mongoose.startSession();

  try {
    let medicoUserId: mongoose.Types.ObjectId | null = null;

    await session.withTransaction(async () => {
      const [user] = await User.create(
        [
          {
            email: input.email.toLowerCase(),
            passwordHash,
            role: UserRole.MEDICO,
            nombre: input.nombre,
            apellido: input.apellido,
            telefono: input.telefono,
          },
        ],
        { session },
      );

      await MedicoProfile.create(
        [
          {
            userId: user._id,
            especialidad: input.especialidad,
            numeroColegiatura: input.numeroColegiatura,
            duracionSlotMin: input.duracionSlotMin ?? 30,
          },
        ],
        { session },
      );

      medicoUserId = user._id;
    });

    return getMedicoByUserId(medicoUserId!.toString());
  } finally {
    await session.endSession();
  }
}

/** Lista los médicos (perfil + datos básicos del usuario). */
export async function listMedicos(soloActivos = false) {
  const filter = soloActivos ? { activo: true } : {};
  return MedicoProfile.find(filter)
    .populate('userId', 'nombre apellido email telefono isActive')
    .sort({ createdAt: -1 });
}

export async function getMedicoByUserId(medicoUserId: string) {
  const profile = await MedicoProfile.findOne({ userId: medicoUserId }).populate(
    'userId',
    'nombre apellido email telefono isActive',
  );
  if (!profile) throw AppError.notFound('Médico no encontrado');
  return profile;
}

export async function updateHorario(
  medicoUserId: string,
  input: UpdateHorarioInput,
  requester: AccessTokenPayload,
) {
  assertAdminOrOwner(requester, medicoUserId);
  const profile = await MedicoProfile.findOne({ userId: medicoUserId });
  if (!profile) throw AppError.notFound('Médico no encontrado');

  profile.horarios = input.horarios;
  if (input.duracionSlotMin) profile.duracionSlotMin = input.duracionSlotMin;
  await profile.save();
  return profile;
}

export async function updateProfile(
  medicoUserId: string,
  input: UpdateProfileInput,
  requester: AccessTokenPayload,
) {
  assertAdminOrOwner(requester, medicoUserId);
  const profile = await MedicoProfile.findOne({ userId: medicoUserId });
  if (!profile) throw AppError.notFound('Médico no encontrado');

  if (input.especialidad !== undefined) profile.especialidad = input.especialidad;
  if (input.numeroColegiatura !== undefined)
    profile.numeroColegiatura = input.numeroColegiatura;
  if (input.activo !== undefined) profile.activo = input.activo;
  await profile.save();
  return profile;
}

// ----- Bloqueos -----

export async function createBloqueo(
  medicoUserId: string,
  input: CreateBloqueoInput,
  requester: AccessTokenPayload,
) {
  assertAdminOrOwner(requester, medicoUserId);
  // Confirma que el médico exista
  await getMedicoByUserId(medicoUserId);
  return Bloqueo.create({
    medicoId: medicoUserId,
    desde: input.desde,
    hasta: input.hasta,
    motivo: input.motivo,
  });
}

export async function listBloqueos(medicoUserId: string) {
  return Bloqueo.find({ medicoId: medicoUserId }).sort({ desde: 1 });
}

export async function deleteBloqueo(
  bloqueoId: string,
  requester: AccessTokenPayload,
) {
  const bloqueo = await Bloqueo.findById(bloqueoId);
  if (!bloqueo) throw AppError.notFound('Bloqueo no encontrado');
  assertAdminOrOwner(requester, bloqueo.medicoId.toString());
  await bloqueo.deleteOne();
}
