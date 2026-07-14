import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { UserRole } from '../constants/roles';
import { MedicoProfile, IHorario } from '../models/medicoProfile.model';
import { User } from '../models/user.model';
import { Bloqueo } from '../models/bloqueo.model';
import { logger } from '../utils/logger';

const BCRYPT_ROUNDS = 12;
const ESPECIALIDAD = 'Cardiología';
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Cardiólogos demo que garantizamos que existan (además de los que ya tengas). */
const CARDIO_DEMO_EMAILS = ['alt.demo+cardio.1@ehr.dev', 'alt.demo+cardio.2@ehr.dev'];

/** Genera franjas para un conjunto de días con uno o dos tramos horarios. */
function franjas(dias: number[], tramos: Array<[string, string]>): IHorario[] {
  return dias.flatMap((diaSemana) =>
    tramos.map(([horaInicio, horaFin]) => ({ diaSemana, horaInicio, horaFin })),
  );
}

/**
 * Horarios COMPLEMENTARIOS por diseño:
 * - El médico de referencia NO atiende Martes ni Jueves.
 * - Todos los alternativos SÍ cubren Martes y Jueves.
 * Así, al elegir al referente en un Martes/Jueves, se activan los alternativos.
 */
const HORARIO_REFERENCIA = franjas([1, 3, 5], [['08:00', '13:00']]); // Lun, Mié, Vie
const HORARIOS_ALTERNATIVOS: IHorario[][] = [
  franjas([2, 4, 5], [['09:00', '13:00'], ['15:00', '18:00']]), // Mar, Jue, Vie
  franjas([1, 2, 4], [['08:00', '12:00']]),                     // Lun, Mar, Jue
  franjas([1, 2, 3, 4, 5], [['08:00', '12:00'], ['15:00', '18:00']]), // Lun-Vie
];

/** Próximo jueves (diaSemana=4) a partir de hoy, como fecha YYYY-MM-DD. */
function proximoJueves(): { fecha: string; label: string } {
  const now = new Date();
  let diff = 4 - now.getDay();
  if (diff <= 0) diff += 7;
  const d = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { fecha, label: `${DIAS[d.getDay()]} ${fecha}` };
}

async function crearCardiologoDemo(email: string, colegiatura: string): Promise<string> {
  const existe = await User.findOne({ email });
  if (existe) return existe._id.toString();

  const nombre = faker.person.firstName();
  const apellido = faker.person.lastName();
  const claveHash = await bcrypt.hash('SeedDemo1234', BCRYPT_ROUNDS);
  const [user] = await User.create([
    { email, claveHash, rol: UserRole.MEDICO, nombre, apellido, telefono: `9${faker.string.numeric(8)}` },
  ]);
  await MedicoProfile.create([
    {
      usuarioId: user._id,
      especialidad: ESPECIALIDAD,
      numeroColegiatura: colegiatura,
      duracionSlotMin: 30,
      horarios: [],
    },
  ]);
  logger.info(`+ Creado cardiólogo demo: ${nombre} ${apellido} <${email}>`);
  return user._id.toString();
}

async function seedAlternativos(): Promise<void> {
  await connectDatabase();
  try {
    logger.info('=== Seed: escenario determinista de médicos alternativos (Cardiología) ===');

    // 1. Garantizar al menos 2 cardiólogos demo (por si la BD está fresca).
    await crearCardiologoDemo(CARDIO_DEMO_EMAILS[0], 'ALT-CARD-0001');
    await crearCardiologoDemo(CARDIO_DEMO_EMAILS[1], 'ALT-CARD-0002');

    // 2. Cargar TODOS los cardiólogos activos con su usuario.
    const perfiles = await MedicoProfile.find({ especialidad: ESPECIALIDAD, activo: true }).populate(
      'usuarioId',
      'nombre apellido email',
    );
    if (perfiles.length < 2) {
      logger.error('Se necesitan al menos 2 cardiólogos activos para el escenario.');
      return;
    }

    // 3. Elegir referente: preferimos un médico "real" (email sin seed/alt.demo).
    const esDemo = (email: string) => /(?:seed\.demo|alt\.demo)/.test(email);
    perfiles.sort((a, b) => {
      const ea = (a.usuarioId as any).email as string;
      const eb = (b.usuarioId as any).email as string;
      return Number(esDemo(ea)) - Number(esDemo(eb));
    });
    const [referente, ...alternativos] = perfiles;
    const nombreDe = (p: typeof referente) =>
      `${(p.usuarioId as any).nombre} ${(p.usuarioId as any).apellido}`;

    // 4. Asignar horarios complementarios.
    referente.horarios = HORARIO_REFERENCIA;
    await referente.save();
    alternativos.forEach((p, i) => {
      p.horarios = HORARIOS_ALTERNATIVOS[i % HORARIOS_ALTERNATIVOS.length];
    });
    await Promise.all(alternativos.map((p) => p.save()));

    // 5. Limpiar bloqueos de prueba antiguos (evita datos huérfanos que confunden).
    const del = await Bloqueo.deleteMany({ motivo: /^\[test-alternativos\]/ });
    if (del.deletedCount) logger.info(`Bloqueos de prueba antiguos eliminados: ${del.deletedCount}`);

    // 6. Reporte con instrucciones.
    const { label } = proximoJueves();
    logger.info('\n========================================');
    logger.info('   ESCENARIO DE MÉDICOS ALTERNATIVOS LISTO');
    logger.info('========================================');
    logger.info(`Especialidad: ${ESPECIALIDAD}`);
    logger.info(`Médico de referencia (NO atiende Martes/Jueves):`);
    logger.info(`  → Dr(a). ${nombreDe(referente)} <${(referente.usuarioId as any).email}>`);
    logger.info(`     Atiende: Lunes, Miércoles y Viernes 08:00–13:00`);
    logger.info(`Cardiólogos alternativos (SÍ atienden Martes/Jueves):`);
    alternativos.forEach((p) => {
      const dias = [...new Set(p.horarios.map((h) => h.diaSemana))].sort().map((d) => DIAS[d]).join(', ');
      logger.info(`  → Dr(a). ${nombreDe(p)} <${(p.usuarioId as any).email}> — ${dias}`);
    });
    logger.info('\nPara ver los alternativos en acción:');
    logger.info(`  1. Entra como paciente y ve a "Reservar cita".`);
    logger.info(`  2. Elige al Dr(a). ${nombreDe(referente)} (${ESPECIALIDAD}).`);
    logger.info(`  3. Pon la fecha: ${label} (o cualquier Martes/Jueves).`);
    logger.info(`  4. Como ese día no atiende, aparecerán los cardiólogos alternativos`);
    logger.info(`     con sus horarios disponibles para esa misma fecha.`);
    logger.info('========================================\n');
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
