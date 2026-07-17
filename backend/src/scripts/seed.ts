import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { ESPECIALIDADES_SEED } from '../constants/especialidades';
import { UserRole } from '../constants/roles';
import { Appointment, AppointmentModality, AppointmentStatus } from '../models/appointment.model';
import { AppointmentType, IAppointmentType } from '../models/appointmentType.model';
import { Especialidad } from '../models/especialidad.model';
import { Invoice } from '../models/invoice.model';
import { MedicalRecord } from '../models/medicalRecord.model';
import { MedicoProfile } from '../models/medicoProfile.model';
import { Notification } from '../models/notification.model';
import { Prescription } from '../models/prescription.model';
import { User, IUser } from '../models/user.model';
import * as authService from '../modules/auth/auth.service';
import * as appointmentService from '../modules/appointment/appointment.service';
import * as invoiceService from '../modules/invoice/invoice.service';
import * as medicoService from '../modules/medico/medico.service';
import * as patientService from '../modules/patient/patient.service';
import * as prescriptionService from '../modules/prescription/prescription.service';
import * as recordService from '../modules/record/record.service';
import type { AccessTokenPayload } from '../utils/jwt';
import { logger } from '../utils/logger';
import {
  buildDoctorSeedInput,
  buildHistoricalDates,
  buildPatientSeedInput,
  buildRiskKeywords,
  buildRiskTrend,
  buildSafeMedicationPlan,
  buildWeeklySchedule,
  pickDominantSpecialty,
  pickHistoricalVisitCount,
} from './seed.generators';
import type { PatientRiskProfile, SeedScheduleSlot } from './seed.types';

const BCRYPT_ROUNDS = 12;
const SEED_EMAIL_NAMESPACE = 'seed.demo+';
const SEED_PREFIX = '[seed-demo]';
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? 'SeedDemo1234';
const DEFAULT_DOCTOR_COUNT = 10;
const DEFAULT_PATIENT_COUNT = 48;
const DEFAULT_MONTHS_BACK = 6;
const DEFAULT_PAID_RATIO = 0.75;
const SLOT_OPTIONS = [20, 30, 60] as const;

interface SeedDoctorContext {
  userId: string;
  email: string;
  specialty: string;
  slotMinutes: number;
  schedule: SeedScheduleSlot[];
}

interface SeedPatientContext {
  seedIndex: number;
  userId: string;
  email: string;
  alergias: string[];
  profile: PatientRiskProfile;
  dominantSpecialty: string;
}

interface SeedCounters {
  doctors: number;
  patients: number;
  appointments: number;
  records: number;
  prescriptions: number;
  invoices: number;
}

const STATIC_USERS = [
  {
    email: 'admin@ehr.dev',
    password: 'Admin1234',
    role: UserRole.ADMIN,
    nombre: 'Ana',
    apellido: 'Administradora',
  },
  {
    email: 'recepcion@ehr.dev',
    password: 'Recepcion1234',
    role: UserRole.RECEPCIONISTA,
    nombre: 'Rosa',
    apellido: 'Recepción',
  },
] as const;

function parseIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseRatioEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

const SEED_DOCTOR_COUNT = parseIntEnv(process.env.SEED_DOCTORS, DEFAULT_DOCTOR_COUNT);
const SEED_PATIENT_COUNT = parseIntEnv(process.env.SEED_PATIENTS, DEFAULT_PATIENT_COUNT);
const SEED_MONTHS_BACK = parseIntEnv(process.env.SEED_MONTHS_BACK, DEFAULT_MONTHS_BACK);
const SEED_PAID_RATIO = parseRatioEnv(process.env.SEED_PAID_RATIO, DEFAULT_PAID_RATIO);

function requesterFromUser(user: Pick<IUser, '_id' | 'email' | 'rol'>): AccessTokenPayload {
  return {
    sub: user._id.toString(),
    role: user.rol,
    email: user.email,
  };
}

function hashPrescription(
  codigo: string,
  pacienteId: string,
  medicamentos: Array<{ nombre: string; dosis?: string; frecuencia?: string; duracion?: string }>,
  emitidaEn: Date,
): string {
  // Misma proyección canónica (campos legacy) que usa el servicio y `verificar`,
  // para que las recetas del seed pasen la verificación de integridad.
  const canonical = JSON.stringify({
    codigo,
    pacienteId,
    medicamentos: medicamentos.map((m) => ({
      nombre: m.nombre,
      dosis: m.dosis,
      frecuencia: m.frecuencia,
      duracion: m.duracion,
    })),
    emitidaEn: emitidaEn.toISOString(),
  });

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function specialtyPriority(count: number): string[] {
  const curated = [
    'Medicina General',
    'Medicina Interna',
    'Cardiología',
    'Endocrinología',
    'Neumología',
    'Nutrición',
    'Pediatría',
    'Dermatología',
    'Ginecología y Obstetricia',
    'Neurología',
    'Traumatología y Ortopedia',
    'Psiquiatría',
    'Urología',
    'Oftalmología',
    'Gastroenterología',
  ];

  return [...new Set([...curated, ...ESPECIALIDADES_SEED])].slice(0, count);
}

function slotMinutesForIndex(index: number): number {
  return SLOT_OPTIONS[index % SLOT_OPTIONS.length];
}

function pickDoctorForPatient(
  patient: SeedPatientContext,
  doctors: SeedDoctorContext[],
): SeedDoctorContext {
  const priorityBySpecialty: Record<string, string[]> = {
    'Cardiología': ['Cardiología', 'Medicina Interna', 'Medicina General'],
    'Endocrinología': ['Endocrinología', 'Medicina Interna', 'Nutrición', 'Medicina General'],
    'Neumología': ['Neumología', 'Medicina General', 'Medicina Interna'],
    'Medicina General': ['Medicina General', 'Medicina Interna'],
  };

  const priority =
    priorityBySpecialty[patient.dominantSpecialty] ?? [patient.dominantSpecialty, 'Medicina General'];

  for (const specialty of priority) {
    const doctor = doctors.find((item) => item.specialty === specialty);
    if (doctor) return doctor;
  }

  return doctors[0];
}

function buildClinicalNarrative(
  specialty: string,
  visitIndex: number,
  totalVisits: number,
): {
  motivo: string;
  diagnostico: string;
  cie10: string;
  tratamiento: string;
  indicaciones: string;
} {
  const isLastVisit = visitIndex === totalVisits - 1;

  switch (specialty) {
    case 'Cardiología':
      return {
        motivo: 'Control de presión arterial y riesgo cardiovascular',
        diagnostico: isLastVisit
          ? 'Hipertensión arterial persistente en seguimiento'
          : 'Hipertensión arterial en seguimiento',
        cie10: 'I10',
        tratamiento: 'Plan de control de sodio, caminatas y vigilancia periódica.',
        indicaciones: 'Registrar la presión en casa y mantener adherencia al tratamiento.',
      };
    case 'Endocrinología':
    case 'Nutrición':
      return {
        motivo: 'Control metabólico con glucosa alterada',
        diagnostico: isLastVisit
          ? 'Diabetes mellitus tipo 2 en control insuficiente'
          : 'Alteración metabólica en seguimiento',
        cie10: 'E11.9',
        tratamiento: 'Ajuste de plan nutricional y educación terapéutica.',
        indicaciones: 'Evitar bebidas azucaradas y registrar glucemias de ayuno.',
      };
    case 'Neumología':
      return {
        motivo: 'Seguimiento respiratorio por disnea y tos recurrente',
        diagnostico: isLastVisit
          ? 'Asma persistente parcialmente controlada'
          : 'Síntomas respiratorios crónicos en evaluación',
        cie10: 'J45.4',
        tratamiento: 'Optimizar técnica inhalatoria y control de desencadenantes.',
        indicaciones: 'Usar inhaladores como se indicó y vigilar saturación en casa.',
      };
    default:
      return {
        motivo: 'Chequeo clínico integral y seguimiento preventivo',
        diagnostico: isLastVisit
          ? 'Control preventivo sin hallazgos mayores'
          : 'Evaluación clínica general de seguimiento',
        cie10: 'Z00.0',
        tratamiento: 'Promover hábitos saludables, sueño y actividad física.',
        indicaciones: 'Mantener alimentación balanceada y control anual.',
      };
  }
}

function buildInvoiceConcept(specialty: string, slotMinutes: number) {
  const base = specialty === 'Cardiología' || specialty === 'Endocrinología' || specialty === 'Neumología'
    ? 110
    : 85;
  const premium = slotMinutes >= 60 ? 30 : slotMinutes >= 30 ? 15 : 0;

  return {
    descripcion: `Consulta de ${specialty}`,
    cantidad: 1,
    precioUnitario: base + premium,
  };
}

function maxRiskWeight(profile: PatientRiskProfile): number {
  const weights = { bajo: 1, medio: 2, alto: 3 } as const;
  return Math.max(
    weights[profile.cardiovascular],
    weights[profile.metabolico],
    weights[profile.respiratorio],
  );
}

function alignDatesToRisk(
  dates: Date[],
  profile: PatientRiskProfile,
): Date[] {
  const maxRisk = maxRiskWeight(profile);
  const allHigh =
    profile.cardiovascular === 'alto' &&
    profile.metabolico === 'alto' &&
    profile.respiratorio === 'alto';

  return dates.map((date, index) => {
    const adjusted = new Date();
    if (allHigh) {
      const daysAgo = (dates.length - 1 - index) * 12 + 3;
      adjusted.setTime(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    } else if (maxRisk >= 3) {
      const daysAgo = (dates.length - 1 - index) * 18 + 7;
      adjusted.setTime(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    } else {
      adjusted.setTime(date.getTime());
    }
    adjusted.setHours(date.getHours(), date.getMinutes(), 0, 0);
    return adjusted;
  });
}

function shouldMarkPaid(patientSeedIndex: number, visitIndex: number): boolean {
  const normalized = (((patientSeedIndex + 1) * 17 + visitIndex * 13) % 100) / 100;
  return normalized < SEED_PAID_RATIO;
}

async function ensureStaticUser(data: (typeof STATIC_USERS)[number]): Promise<IUser> {
  const existing = await User.findOne({ email: data.email });
  if (existing) return existing;

  const claveHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const created = await User.create({
    email: data.email,
    claveHash,
    rol: data.role,
    nombre: data.nombre,
    apellido: data.apellido,
  });

  logger.info(`+ creado usuario base: ${data.email}`);
  return created;
}

async function cleanupSeedData(): Promise<void> {
  const seedUsers = await User.find({
    email: { $regex: `^${SEED_EMAIL_NAMESPACE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
  }).select('_id email rol');

  if (seedUsers.length === 0) {
    logger.info('= no había datos previos del seed para limpiar');
    return;
  }

  const userIds = seedUsers.map((user) => user._id);
  const appointments = await Appointment.find({
    $or: [{ medicoId: { $in: userIds } }, { pacienteId: { $in: userIds } }],
  }).select('_id');
  const appointmentIds = appointments.map((item) => item._id);

  const records = await MedicalRecord.find({
    $or: [
      { medicoId: { $in: userIds } },
      { pacienteId: { $in: userIds } },
      { citaId: { $in: appointmentIds } },
    ],
  }).select('_id');
  const recordIds = records.map((item) => item._id);

  await Notification.deleteMany({ usuarioId: { $in: userIds } });
  await Invoice.deleteMany({
    $or: [
      { pacienteId: { $in: userIds } },
      { medicoId: { $in: userIds } },
      { emitidaPor: { $in: userIds } },
      { citaId: { $in: appointmentIds } },
    ],
  });
  await Prescription.deleteMany({
    $or: [
      { pacienteId: { $in: userIds } },
      { medicoId: { $in: userIds } },
      { historialId: { $in: recordIds } },
    ],
  });
  await MedicalRecord.deleteMany({ _id: { $in: recordIds } });
  await Appointment.deleteMany({ _id: { $in: appointmentIds } });
  await MedicoProfile.deleteMany({ usuarioId: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  logger.info(`= limpieza seed completada (${seedUsers.length} usuarios demo removidos)`);
}

async function seedCatalogs(): Promise<void> {
  await Especialidad.bulkWrite(
    ESPECIALIDADES_SEED.map((nombre) => ({
      updateOne: {
        filter: { nombre },
        update: { $setOnInsert: { nombre, activo: true } },
        upsert: true,
      },
    })),
  );

  const tipos = [
    { nombre: 'Consulta general', duracionMin: 30, color: '#2563eb' },
    { nombre: 'Control', duracionMin: 20, color: '#16a34a' },
    { nombre: 'Teleconsulta', duracionMin: 20, color: '#7c3aed' },
  ];

  for (const tipo of tipos) {
    await AppointmentType.findOneAndUpdate({ nombre: tipo.nombre }, tipo, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  logger.info('= catálogos de especialidades y tipos de cita listos');
}

async function seedDoctors(adminRequester: AccessTokenPayload): Promise<SeedDoctorContext[]> {
  const specialties = specialtyPriority(SEED_DOCTOR_COUNT);
  const doctors: SeedDoctorContext[] = [];

  for (const [index, specialty] of specialties.entries()) {
    const slotMinutes = slotMinutesForIndex(index);
    const input = buildDoctorSeedInput(index + 1, specialty);
    input.password = DEFAULT_PASSWORD;
    input.duracionSlotMin = slotMinutes;

    const profile = await medicoService.createMedico(input);
    const profileUser = profile.usuarioId as unknown as {
      _id: { toString(): string };
      email: string;
    };
    const schedule = buildWeeklySchedule(slotMinutes);

    await medicoService.updateHorario(
      profileUser._id.toString(),
      { duracionSlotMin: slotMinutes, horarios: schedule },
      adminRequester,
    );

    doctors.push({
      userId: profileUser._id.toString(),
      email: input.email,
      specialty,
      slotMinutes,
      schedule,
    });
  }

  logger.info(`+ médicos seed creados: ${doctors.length}`);
  return doctors;
}

async function seedPatients(): Promise<SeedPatientContext[]> {
  const patients: SeedPatientContext[] = [];

  for (let index = 0; index < SEED_PATIENT_COUNT; index += 1) {
    const input = buildPatientSeedInput(index + 1);
    input.password = DEFAULT_PASSWORD;

    const created = await patientService.create({
      email: input.email,
      password: input.password,
      nombre: input.nombre,
      apellido: input.apellido,
      telefono: input.telefono,
      tipoDocumento: input.tipoDocumento,
      numeroDocumento: input.numeroDocumento,
    });

    await authService.updateMe(created._id.toString(), {
      telefono: input.telefono,
      alergias: input.alergias,
    });

    patients.push({
      seedIndex: index,
      userId: created._id.toString(),
      email: input.email,
      alergias: input.alergias,
      profile: input.profile,
      dominantSpecialty: pickDominantSpecialty(input.profile, ['Medicina General']),
    });
  }

  logger.info(`+ pacientes seed creados: ${patients.length}`);
  return patients;
}

async function buildAppointmentTypeMap(): Promise<Record<'consulta' | 'control', IAppointmentType | null>> {
  const [consulta, control] = await Promise.all([
    AppointmentType.findOne({ nombre: 'Consulta general' }),
    AppointmentType.findOne({ nombre: 'Control' }),
  ]);

  return { consulta, control };
}

async function seedClinicalHistory(
  doctors: SeedDoctorContext[],
  patients: SeedPatientContext[],
): Promise<SeedCounters> {
  const counters: SeedCounters = {
    doctors: doctors.length,
    patients: patients.length,
    appointments: 0,
    records: 0,
    prescriptions: 0,
    invoices: 0,
  };

  const appointmentTypes = await buildAppointmentTypeMap();

  for (const patient of patients) {
    const doctor = pickDoctorForPatient(patient, doctors);
    const doctorRequester: AccessTokenPayload = {
      sub: doctor.userId,
      role: UserRole.MEDICO,
      email: doctor.email,
    };
    const visitCount = pickHistoricalVisitCount(patient.profile);
    const dates = alignDatesToRisk(
      buildHistoricalDates({
        monthsBack: SEED_MONTHS_BACK,
        visitCount,
        weeklySchedule: doctor.schedule,
      }),
      patient.profile,
    );
    const riskKeywords = buildRiskKeywords(patient.profile);

    for (const [visitIndex, fechaHora] of dates.entries()) {
      const appointmentType = visitIndex === 0 ? appointmentTypes.consulta : appointmentTypes.control;
      const narrative = buildClinicalNarrative(doctor.specialty, visitIndex, dates.length);
      const appointment = await Appointment.create({
        medicoId: doctor.userId,
        pacienteId: patient.userId,
        tipoCitaId: appointmentType?._id,
        fechaHora,
        duracionMin: appointmentType?.duracionMin ?? doctor.slotMinutes,
        estado: AppointmentStatus.RESERVADA,
        modalidad: AppointmentModality.PRESENCIAL,
        motivo: `${SEED_PREFIX} ${narrative.motivo}`,
      });
      counters.appointments += 1;

      await appointmentService.actualizarEstado(appointment._id.toString(), doctorRequester, {
        estado: AppointmentStatus.ATENDIDA,
      });

      const record = await recordService.createRecord(doctor.userId, {
        pacienteId: patient.userId,
        citaId: appointment._id.toString(),
        motivo: `${SEED_PREFIX} ${narrative.motivo}`,
        diagnostico: narrative.diagnostico,
        cie10: narrative.cie10,
        notas: `${SEED_PREFIX} evolución clínica coherente con la trayectoria de riesgo del paciente. Keywords: ${riskKeywords.join(', ')}.`,
        tratamiento: narrative.tratamiento,
        signosVitales: buildRiskTrend({
          profile: patient.profile,
          visitIndex,
          totalVisits: dates.length,
        }),
      });
      counters.records += 1;

      const recordDoc = await MedicalRecord.findById(record._id);
      if (recordDoc) {
        recordDoc.fecha = new Date(fechaHora.getTime() + 15 * 60_000);
        await recordDoc.save();
      }

      const prescriptionResult = await prescriptionService.emitir(doctor.userId, {
        pacienteId: patient.userId,
        historialId: record._id.toString(),
        medicamentos: buildSafeMedicationPlan({
          specialty: doctor.specialty,
          alergias: patient.alergias,
        }).map((m) => ({ ...m, segunNecesidad: m.segunNecesidad ?? false })),
        indicaciones: narrative.indicaciones,
      });
      counters.prescriptions += 1;

      const prescriptionDoc = await Prescription.findById(prescriptionResult.receta._id);
      if (prescriptionDoc) {
        prescriptionDoc.emitidaEn = new Date(fechaHora.getTime() + 20 * 60_000);
        prescriptionDoc.hash = hashPrescription(
          prescriptionDoc.codigo,
          patient.userId,
          prescriptionDoc.medicamentos,
          prescriptionDoc.emitidaEn,
        );
        await prescriptionDoc.save();
      }

      const invoice = await invoiceService.crear(doctorRequester, {
        citaId: appointment._id.toString(),
        impuestoPct: 0,
        notas: `${SEED_PREFIX} atención integral de ${doctor.specialty}`,
        conceptos: [buildInvoiceConcept(doctor.specialty, doctor.slotMinutes)],
      });
      counters.invoices += 1;

      const invoiceDoc = await Invoice.findById(invoice._id);
      if (invoiceDoc) {
        invoiceDoc.emitidaEn = new Date(fechaHora.getTime() + 25 * 60_000);

        if (shouldMarkPaid(patient.seedIndex, visitIndex)) {
          await invoiceService.marcarPagada(invoiceDoc._id.toString());
          const paidInvoiceDoc = await Invoice.findById(invoiceDoc._id);
          if (paidInvoiceDoc) {
            paidInvoiceDoc.emitidaEn = new Date(fechaHora.getTime() + 25 * 60_000);
            paidInvoiceDoc.pagadaEn = new Date(fechaHora.getTime() + 35 * 60_000);
            paidInvoiceDoc.metodoPago = paidInvoiceDoc.metodoPago ?? 'Tarjeta demo';
            await paidInvoiceDoc.save();
          }
        } else {
          await invoiceDoc.save();
        }
      }
    }
  }

  return counters;
}

async function emitSummary(counters: SeedCounters): Promise<void> {
  logger.info('=== Resumen seed demo ===');
  logger.info(`Médicos: ${counters.doctors}`);
  logger.info(`Pacientes: ${counters.patients}`);
  logger.info(`Citas atendidas: ${counters.appointments}`);
  logger.info(`Consultas clínicas: ${counters.records}`);
  logger.info(`Recetas: ${counters.prescriptions}`);
  logger.info(`Facturas: ${counters.invoices}`);
  logger.info(`Password demo para usuarios seed: ${DEFAULT_PASSWORD}`);
  logger.info(`Ejemplos de login: ${SEED_EMAIL_NAMESPACE}doctor.1@ehr.dev / ${SEED_EMAIL_NAMESPACE}patient.1@ehr.dev`);
}

async function seed(): Promise<void> {
  await connectDatabase();

  try {
    logger.info('=== Seed demo clínico ===');
    await cleanupSeedData();
    await seedCatalogs();

    const [admin] = await Promise.all(STATIC_USERS.map(ensureStaticUser));
    const adminRequester = requesterFromUser(admin);

    const doctors = await seedDoctors(adminRequester);
    const patients = await seedPatients();
    const counters = await seedClinicalHistory(doctors, patients);

    await emitSummary(counters);
  } finally {
    await disconnectDatabase();
  }
}

seed()
  .then(() => {
    logger.info('✅ Seed completado');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Error en seed:', err);
    process.exit(1);
  });
