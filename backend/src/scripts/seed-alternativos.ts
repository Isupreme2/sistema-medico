import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { UserRole } from '../constants/roles';
import { MedicoProfile } from '../models/medicoProfile.model';
import { User } from '../models/user.model';
import { Bloqueo } from '../models/bloqueo.model';
import { buildDate } from '../utils/slots';
import { logger } from '../utils/logger';
import { buildWeeklySchedule } from './seed.generators';

const BCRYPT_ROUNDS = 12;

const DEMO_DOCTOR_EMAILS = [
  'seed.demo+doctor.1@ehr.dev',
  'seed.demo+doctor.2@ehr.dev',
  'seed.demo+doctor.3@ehr.dev',
];

function nextWeekday(dayOfWeek: number): Date {
  const now = new Date();
  const currentDay = now.getDay();
  let diff = dayOfWeek - currentDay;
  if (diff <= 0) diff += 7;
  const result = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function seedAlternativos(): Promise<void> {
  await connectDatabase();

  try {
    logger.info('=== Seed: Escenario de médicos alternativos ===');

    // 1. Verificar doctores existentes del seed principal
    const seedUsers = await User.find({ email: { $in: DEMO_DOCTOR_EMAILS } }).select('_id email rol');
    logger.info(`Doctores base encontrados: ${seedUsers.length}`);

    if (seedUsers.length < 3) {
      logger.error('Ejecuta primero "npm run seed" para tener los datos base');
      return;
    }

    // 2. Identificar el cardiólogo y el médico de Medicina General
    const doctors = await MedicoProfile.find({ usuarioId: { $in: seedUsers.map((u) => u._id) } })
      .populate('usuarioId', 'nombre apellido email');

    const cardiologo = doctors.find((d) => d.especialidad === 'Cardiología');
    const medicoGeneral = doctors.find((d) => d.especialidad === 'Medicina General');

    if (!cardiologo || !medicoGeneral) {
      logger.error('No se encontraron los médicos necesarios. Especialidades disponibles:');
      doctors.forEach((d) => logger.error(`  - ${d.especialidad}`));
      return;
    }

    const cardioUserId = cardiologo.usuarioId._id.toString();
    const mgUserId = medicoGeneral.usuarioId._id.toString();
    const cardioName = `${(cardiologo.usuarioId as any).nombre} ${(cardiologo.usuarioId as any).apellido}`;
    const mgName = `${(medicoGeneral.usuarioId as any).nombre} ${(medicoGeneral.usuarioId as any).apellido}`;

    logger.info(`Cardiólogo: ${cardioName} (${cardioUserId})`);
    logger.info(`Medicina General: ${mgName} (${mgUserId})`);

    // 3. Crear 2 Cardiólogos adicionales (para que hayan alternativos de la misma especialidad)
    const nuevosCardiologos: Array<{ email: string; userId: string }> = [];

    for (let i = 1; i <= 2; i++) {
      const email = `alt.demo+cardio.${i}@ehr.dev`;
      const existe = await User.findOne({ email });
      if (existe) {
        logger.info(`Ya existe: ${email}`);
        nuevosCardiologos.push({ email, userId: existe._id.toString() });
        continue;
      }

      const nombre = faker.person.firstName();
      const apellido = faker.person.lastName();
      const claveHash = await bcrypt.hash('SeedDemo1234', BCRYPT_ROUNDS);

      const [user] = await User.create([
        { email, claveHash, rol: UserRole.MEDICO, nombre, apellido, telefono: `9${faker.string.numeric(8)}` },
      ]);
      await MedicoProfile.create([{
        usuarioId: user._id,
        especialidad: 'Cardiología',
        numeroColegiatura: `ALT-CARD-${String(i).padStart(4, '0')}`,
        duracionSlotMin: 30,
        horarios: buildWeeklySchedule(30),
      }]);

      nuevosCardiologos.push({ email, userId: user._id.toString() });
      logger.info(`+ Creado cardiólogo alternativo #${i}: ${nombre} ${apellido} (${email})`);
    }

    // 4. Crear 1 Medicina General adicional (para el fallback)
    const emailMG = 'alt.demo+mg.1@ehr.dev';
    const existeMG = await User.findOne({ email: emailMG });
    if (!existeMG) {
      const nombre = faker.person.firstName();
      const apellido = faker.person.lastName();
      const claveHash = await bcrypt.hash('SeedDemo1234', BCRYPT_ROUNDS);

      const [user] = await User.create([
        { email: emailMG, claveHash, rol: UserRole.MEDICO, nombre, apellido, telefono: `9${faker.string.numeric(8)}` },
      ]);
      await MedicoProfile.create([{
        usuarioId: user._id,
        especialidad: 'Medicina General',
        numeroColegiatura: 'ALT-MG-0001',
        duracionSlotMin: 30,
        horarios: buildWeeklySchedule(30),
      }]);
      logger.info(`+ Creado Medicina General adicional: ${nombre} ${apellido} (${emailMG})`);
    } else {
      logger.info(`Ya existe: ${emailMG}`);
    }

    // 5. BLOQUEAR al cardiólogo original en un día específico
    const targetDate = nextWeekday(4); // Jueves (diaSemana=4)
    const fechaStr = formatDate(targetDate);
    const desde = buildDate(fechaStr, '07:00');
    const hasta = buildDate(fechaStr, '19:00');

    // Limpiar bloqueos anteriores de prueba
    await Bloqueo.deleteMany({ medicoId: cardioUserId, motivo: /^\[test-alternativos\]/ });

    await Bloqueo.create({
      medicoId: cardioUserId,
      desde,
      hasta,
      motivo: '[test-alternativos] Bloqueo completo para probar médicos alternativos',
    });

    logger.info(`\n========================================`);
    logger.info(`   ESCENARIO DE PRUEBA CREADO`);
    logger.info(`========================================`);
    logger.info(` `);
    logger.info(`Médico sin disponibilidad:`);
    logger.info(`  Dr(a). ${cardioName} (Cardiología) — BLOQUEADO el ${fechaStr}`);
    logger.info(` `);
    logger.info(`Médicos alternativos (misma especialidad):`);
    for (const c of nuevosCardiologos) {
      logger.info(`  - ${c.email}`);
    }
    logger.info(` `);
    logger.info(`Fallback a Medicina General:`);
    logger.info(`  - Dr(a). ${mgName}`);
    logger.info(`  - alt.demo+mg.1@ehr.dev`);
    logger.info(` `);
    logger.info(`========================================`);
    logger.info(` `);
    logger.info(`🔹 Para probar por API:`);
    logger.info(`   GET /api/v1/appointments/alternativos`);
    logger.info(`       ?medicoId=${cardioUserId}`);
    logger.info(`       &fecha=${fechaStr}`);
    logger.info(`       &hora=10:00`);
    logger.info(` `);
    logger.info(`🔹 Para probar desde el navegador (Recepción):`);
    logger.info(`   1. Login como: recepcion@ehr.dev / Recepcion1234`);
    logger.info(`   2. Ir a "Agendar cita"`);
    logger.info(`   3. Seleccionar paciente (ej. seed.demo+patient.1@ehr.dev)`);
    logger.info(`   4. Seleccionar Dr(a). ${cardioName}`);
    logger.info(`   5. Poner fecha: ${fechaStr}`);
    logger.info(`   6. El sistema mostrará "El médico no atiende ese día"`);
    logger.info(`      seguido de "Médicos alternativos disponibles"`);
    logger.info(` `);
    logger.info(`🔹 Para probar desde el navegador (Paciente):`);
    logger.info(`   1. Login como: seed.demo+patient.1@ehr.dev / SeedDemo1234`);
    logger.info(`   2. Ir a "Reservar cita"`);
    logger.info(`   3. Seleccionar Dr(a). ${cardioName}`);
    logger.info(`   4. Poner fecha: ${fechaStr}`);
    logger.info(`   5. Mismo comportamiento — verás alternativos`);
    logger.info(` `);
    logger.info(`🔹 Para probar reprogramación:`);
    logger.info(`   (Requiere tener una cita existente con el cardiólogo)`);
    logger.info(`   - Cancelar la cita desde "Mis citas"`);
    logger.info(`   - Al reservar de nuevo, si el cardio está bloqueado,`);
    logger.info(`     aparecerán los alternativos`);
    logger.info(` `);

  } finally {
    await disconnectDatabase();
  }
}



seedAlternativos()
  .then(() => {
    logger.info('✅ Seed alternativos completado');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Error en seed alternativos:', err);
    process.exit(1);
  });
