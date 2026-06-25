import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { User, IUser } from '../models/user.model';
import { MedicoProfile } from '../models/medicoProfile.model';
import { AppointmentType } from '../models/appointmentType.model';
import { Appointment, AppointmentStatus, AppointmentModality } from '../models/appointment.model';
import { MedicalRecord } from '../models/medicalRecord.model';
import { Prescription } from '../models/prescription.model';
import { Invoice, InvoiceStatus } from '../models/invoice.model';
import { UserRole } from '../constants/roles';
import { calcularTotales } from '../utils/billing';
import { logger } from '../utils/logger';

/**
 * Pobla la base con datos de DEMOSTRACIÓN realistas e idempotentes:
 * cuentas por rol, perfil + horario del médico, tipos de cita, citas en varios
 * estados, una consulta clínica, una receta verificable y facturas.
 * Ejecutar con: npm run seed
 */

const DEMO_USERS = [
  { email: 'admin@ehr.dev', password: 'Admin1234', role: UserRole.ADMIN, nombre: 'Ana', apellido: 'Administradora' },
  { email: 'recepcion@ehr.dev', password: 'Recepcion1234', role: UserRole.RECEPCIONISTA, nombre: 'Rosa', apellido: 'Recepción' },
  { email: 'medico@ehr.dev', password: 'Medico1234', role: UserRole.MEDICO, nombre: 'Carlos', apellido: 'Pérez' },
  { email: 'paciente@ehr.dev', password: 'Paciente1234', role: UserRole.PACIENTE, nombre: 'Juan', apellido: 'Gómez', alergias: ['penicilina'] },
  { email: 'maria@ehr.dev', password: 'Paciente1234', role: UserRole.PACIENTE, nombre: 'María', apellido: 'Torres' },
];

/** Fecha a N días (negativo = pasado) a una hora local concreta. */
function diaA(offset: number, hh: number, mm = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** Hash canónico idéntico al de prescription.service para que la verificación dé integridadOk. */
function hashReceta(codigo: string, pacienteId: string, medicamentos: unknown, emitidaEn: Date): string {
  const canonical = JSON.stringify({ codigo, pacienteId, medicamentos, emitidaEn: emitidaEn.toISOString() });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

async function upsertUser(u: (typeof DEMO_USERS)[number]): Promise<IUser> {
  const existente = await User.findOne({ email: u.email });
  if (existente) {
    logger.info(`= ya existe: ${u.email} (${u.role})`);
    return existente;
  }
  const claveHash = await bcrypt.hash(u.password, 12);
  const creado = await User.create({
    email: u.email,
    claveHash,
    rol: u.role,
    nombre: u.nombre,
    apellido: u.apellido,
    alergias: (u as { alergias?: string[] }).alergias ?? [],
  });
  logger.info(`+ creado: ${u.email} / ${u.password} (${u.role})`);
  return creado;
}

async function seed(): Promise<void> {
  await connectDatabase();

  // 1) Usuarios
  const users: Record<string, IUser> = {};
  for (const u of DEMO_USERS) {
    users[u.email] = await upsertUser(u);
  }
  const medico = users['medico@ehr.dev'];
  const juan = users['paciente@ehr.dev'];
  const maria = users['maria@ehr.dev'];
  const admin = users['admin@ehr.dev'];

  // 2) Perfil + horario del médico (Lun-Vie 08:00-13:00 y 15:00-18:00)
  const franjas = [1, 2, 3, 4, 5].flatMap((diaSemana) => [
    { diaSemana, horaInicio: '08:00', horaFin: '13:00' },
    { diaSemana, horaInicio: '15:00', horaFin: '18:00' },
  ]);
  await MedicoProfile.findOneAndUpdate(
    { usuarioId: medico._id },
    {
      usuarioId: medico._id,
      especialidad: 'Medicina General',
      numeroColegiatura: 'CMP-12345',
      duracionSlotMin: 30,
      horarios: franjas,
      activo: true,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  logger.info('= perfil y horario del médico listos');

  // 3) Tipos de cita
  const tipos = [
    { nombre: 'Consulta general', duracionMin: 30, color: '#2563eb' },
    { nombre: 'Control', duracionMin: 20, color: '#16a34a' },
    { nombre: 'Procedimiento', duracionMin: 45, color: '#7c3aed' },
  ];
  for (const t of tipos) {
    await AppointmentType.findOneAndUpdate({ nombre: t.nombre }, t, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
  logger.info('= tipos de cita listos');

  // 4) Datos clínicos de demo (guardados por la factura ancla FAC-DEMO-0001)
  if (await Invoice.findOne({ numero: 'FAC-DEMO-0001' })) {
    logger.info('= datos clínicos de demo ya existían (no se duplican)');
  } else {
    // Citas en varios estados
    const citaAtendida = await Appointment.create({
      medicoId: medico._id, pacienteId: juan._id, fechaHora: diaA(-7, 10, 0),
      duracionMin: 30, estado: AppointmentStatus.ATENDIDA,
      modalidad: AppointmentModality.PRESENCIAL, motivo: '[demo] Dolor abdominal',
    });
    await Appointment.create({
      medicoId: medico._id, pacienteId: maria._id, fechaHora: diaA(-5, 9, 30),
      duracionMin: 30, estado: AppointmentStatus.NO_ASISTIO,
      modalidad: AppointmentModality.PRESENCIAL, motivo: '[demo] Control de presión',
    });
    await Appointment.create({
      medicoId: medico._id, pacienteId: juan._id, fechaHora: diaA(-3, 11, 0),
      duracionMin: 30, estado: AppointmentStatus.CANCELADA,
      modalidad: AppointmentModality.PRESENCIAL, motivo: '[demo] Consulta cancelada',
    });
    await Appointment.create({
      medicoId: medico._id, pacienteId: maria._id, fechaHora: diaA(2, 9, 0),
      duracionMin: 30, estado: AppointmentStatus.RESERVADA,
      modalidad: AppointmentModality.PRESENCIAL, motivo: '[demo] Chequeo general',
    });
    await Appointment.create({
      medicoId: medico._id, pacienteId: juan._id, fechaHora: diaA(3, 11, 30),
      duracionMin: 30, estado: AppointmentStatus.RESERVADA,
      modalidad: AppointmentModality.TELECONSULTA, motivo: '[demo] Teleconsulta seguimiento',
      salaVideo: `EHR-${crypto.randomBytes(12).toString('hex')}`,
    });
    logger.info('+ 5 citas de demo creadas (varios estados y modalidades)');

    // Consulta clínica para la cita atendida
    const record = await MedicalRecord.create({
      pacienteId: juan._id, medicoId: medico._id, citaId: citaAtendida._id,
      fecha: diaA(-7, 10, 15), motivo: 'Dolor abdominal',
      diagnostico: 'Gastritis aguda', cie10: 'K29.1',
      notas: 'Paciente refiere dolor epigástrico de 3 días.',
      tratamiento: 'Dieta blanda e hidratación.',
      signosVitales: {
        peso: 78, talla: 175, presionSistolica: 120, presionDiastolica: 80,
        frecuenciaCardiaca: 72, temperatura: 36.8, saturacionO2: 98,
      },
    });
    logger.info('+ consulta clínica de demo creada');

    // Receta verificable (hash canónico)
    const medicamentos = [
      { nombre: 'Omeprazol', dosis: '20mg', frecuencia: 'cada 24h', duracion: '14 días' },
      { nombre: 'Paracetamol', dosis: '500mg', frecuencia: 'cada 8h', duracion: '3 días' },
    ];
    const codigo = 'RX-DEMO-0001';
    const emitidaEn = diaA(-7, 10, 20);
    await Prescription.create({
      codigo, medicoId: medico._id, pacienteId: juan._id, historialId: record._id,
      medicamentos, indicaciones: 'Tomar con alimentos.', emitidaEn,
      hash: hashReceta(codigo, juan._id.toString(), medicamentos, emitidaEn),
    });
    logger.info(`+ receta de demo creada (${codigo}, verificable)`);

    // Facturas: una pendiente (de la consulta) y una pagada
    const items1 = [
      { descripcion: 'Consulta general', cantidad: 1, precioUnitario: 80 },
      { descripcion: 'Procedimiento menor', cantidad: 1, precioUnitario: 50 },
    ];
    const t1 = calcularTotales(items1, 18);
    await Invoice.create({
      numero: 'FAC-DEMO-0001', pacienteId: juan._id, medicoId: medico._id,
      citaId: citaAtendida._id, emitidaPor: medico._id, conceptos: items1,
      ...t1, impuestoPct: 18, estado: InvoiceStatus.PENDIENTE, emitidaEn: diaA(-7, 10, 30),
    });

    const items2 = [{ descripcion: 'Control', cantidad: 1, precioUnitario: 60 }];
    const t2 = calcularTotales(items2, 18);
    await Invoice.create({
      numero: 'FAC-DEMO-0002', pacienteId: maria._id, medicoId: medico._id,
      emitidaPor: admin._id, conceptos: items2, ...t2, impuestoPct: 18,
      estado: InvoiceStatus.PAGADA, emitidaEn: diaA(-4, 12, 0), pagadaEn: diaA(-4, 12, 5),
    });
    logger.info('+ 2 facturas de demo creadas (1 pendiente, 1 pagada)');
  }

  logger.info('✅ Seed completado');
  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Error en seed:', err);
  process.exit(1);
});
