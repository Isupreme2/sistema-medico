import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { UserRole } from '../constants/roles';
import { MedicoProfile, IHorario } from '../models/medicoProfile.model';
import { User } from '../models/user.model';
import { Bloqueo } from '../models/bloqueo.model';
import { logger } from '../utils/logger';

const BCRYPT_ROUNDS = 12;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TRAMOS_DEFAULT: Array<[string, string]> = [
  ['08:00', '12:00'],
  ['15:00', '18:00'],
];

/** Genera franjas para un conjunto de días (1=Lun … 6=Sáb) con uno o dos tramos. */
function franjas(dias: number[], tramos: Array<[string, string]> = TRAMOS_DEFAULT): IHorario[] {
  return dias.flatMap((diaSemana) =>
    tramos.map(([horaInicio, horaFin]) => ({ diaSemana, horaInicio, horaFin })),
  );
}

/**
 * Escenario por especialidad. Los horarios son COMPLEMENTARIOS por diseño:
 * el referente NO atiende ciertos días y los alternativos SÍ los cubren,
 * de modo que al elegir al referente esos días se activan los médicos alternativos.
 * Cada especialidad deja el "hueco" en días distintos para poder demostrarlo
 * a lo largo de toda la semana.
 */
interface EscenarioEsp {
  especialidad: string;
  slug: string;
  refDias: number[]; // días que atiende el médico de referencia
  altDias: number[][]; // días de cada médico alternativo (mínimo 2)
}

const ESCENARIOS: EscenarioEsp[] = [
  // Referente off Mar/Jue
  { especialidad: 'Cardiología', slug: 'cardio', refDias: [1, 3, 5], altDias: [[2, 4, 5], [1, 2, 4]] },
  // Referente off Lun/Mié/Vie/Sáb (atiende solo Mar/Jue)
  { especialidad: 'Pediatría', slug: 'pedia', refDias: [2, 4], altDias: [[1, 3, 5], [1, 3, 6]] },
  // Referente off Jue/Vie/Sáb
  { especialidad: 'Dermatología', slug: 'derma', refDias: [1, 2, 3], altDias: [[4, 5, 6], [3, 4, 5]] },
  // Referente off Mar/Mié/Vie/Sáb
  { especialidad: 'Medicina General', slug: 'mg', refDias: [1, 4], altDias: [[2, 3, 5], [2, 3, 6]] },
  // Referente off Lun/Mar/Sáb
  { especialidad: 'Neumología', slug: 'neumo', refDias: [3, 4, 5], altDias: [[1, 2, 6], [1, 2, 4]] },
];

function nombreDe(p: { usuarioId: unknown }): string {
  const u = p.usuarioId as { nombre: string; apellido: string };
  return `${u.nombre} ${u.apellido}`;
}
function emailDe(p: { usuarioId: unknown }): string {
  return (p.usuarioId as { email: string }).email;
}
const esDemo = (email: string) => /(?:seed\.demo|alt\.demo)/.test(email);

/** Próxima fecha (>= mañana) que caiga en el día de semana pedido, como YYYY-MM-DD. */
function proximaFecha(diaSemana: number): string {
  const now = new Date();
  let diff = diaSemana - now.getDay();
  if (diff <= 0) diff += 7;
  const d = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Crea un médico demo para una especialidad si no existe. */
async function crearMedicoDemo(slug: string, especialidad: string, n: number): Promise<void> {
  const email = `alt.demo+${slug}.${n}@ehr.dev`;
  if (await User.findOne({ email })) return;

  const nombre = faker.person.firstName();
  const apellido = faker.person.lastName();
  const claveHash = await bcrypt.hash('SeedDemo1234', BCRYPT_ROUNDS);
  const [user] = await User.create([
    { email, claveHash, rol: UserRole.MEDICO, nombre, apellido, telefono: `9${faker.string.numeric(8)}` },
  ]);
  await MedicoProfile.create([
    {
      usuarioId: user._id,
      especialidad,
      numeroColegiatura: `ALT-${slug.toUpperCase()}-${String(n).padStart(4, '0')}`,
      duracionSlotMin: 30,
      horarios: [],
    },
  ]);
  logger.info(`  + Creado médico demo de ${especialidad}: ${nombre} ${apellido} <${email}>`);
}

async function montarEscenario(esc: EscenarioEsp): Promise<string[]> {
  const totalNecesario = 1 + esc.altDias.length; // referente + alternativos

  // 1. Asegurar suficientes médicos activos en la especialidad.
  let existentes = await MedicoProfile.countDocuments({ especialidad: esc.especialidad, activo: true });
  let n = 1;
  while (existentes < totalNecesario) {
    await crearMedicoDemo(esc.slug, esc.especialidad, n);
    n += 1;
    existentes = await MedicoProfile.countDocuments({ especialidad: esc.especialidad, activo: true });
    if (n > 20) break; // salvaguarda
  }

  // 2. Cargar perfiles y elegir referente (preferimos un médico "real", no demo).
  const perfiles = await MedicoProfile.find({ especialidad: esc.especialidad, activo: true }).populate(
    'usuarioId',
    'nombre apellido email',
  );
  perfiles.sort((a, b) => Number(esDemo(emailDe(a))) - Number(esDemo(emailDe(b))));
  const [referente, ...alternativos] = perfiles;

  // 3. Asignar horarios: referente con su hueco; el resto cubriendo esos días.
  referente.horarios = franjas(esc.refDias);
  await referente.save();
  await Promise.all(
    alternativos.map((p, i) => {
      p.horarios = franjas(esc.altDias[i % esc.altDias.length]);
      return p.save();
    }),
  );

  // 4. Días de demo = referente NO atiende pero ≥1 alternativo sí.
  const refSet = new Set(esc.refDias);
  const altUnion = new Set(alternativos.flatMap((p) => p.horarios.map((h) => h.diaSemana)));
  const demoDias = [1, 2, 3, 4, 5, 6].filter((d) => !refSet.has(d) && altUnion.has(d));

  const lineas: string[] = [];
  lineas.push(`### ${esc.especialidad}`);
  lineas.push(
    `  Referente: Dr(a). ${nombreDe(referente)} <${emailDe(referente)}> — atiende ${esc.refDias.map((d) => DIAS[d]).join(', ')}`,
  );
  alternativos.forEach((p) => {
    const dias = [...new Set(p.horarios.map((h) => h.diaSemana))].sort().map((d) => DIAS[d]).join(', ');
    lineas.push(`  Alternativo: Dr(a). ${nombreDe(p)} <${emailDe(p)}> — ${dias}`);
  });
  const fechas = demoDias.map((d) => `${DIAS[d]} (${proximaFecha(d)})`).join('  ·  ');
  lineas.push(`  ➜ Elige al referente en cualquiera de estas fechas para ver alternativos:`);
  lineas.push(`     ${fechas}`);
  return lineas;
}

async function seedAlternativos(): Promise<void> {
  await connectDatabase();
  try {
    logger.info('=== Seed: escenarios de médicos alternativos (multi-especialidad) ===');

    // Limpiar bloqueos de prueba antiguos (datos huérfanos que confunden el demo).
    const del = await Bloqueo.deleteMany({ motivo: /^\[test-alternativos\]/ });
    if (del.deletedCount) logger.info(`Bloqueos de prueba antiguos eliminados: ${del.deletedCount}`);

    const reporte: string[] = [];
    for (const esc of ESCENARIOS) {
      logger.info(`Montando escenario: ${esc.especialidad}…`);
      reporte.push(...(await montarEscenario(esc)), '');
    }

    logger.info('\n=====================================================');
    logger.info('   ESCENARIOS DE MÉDICOS ALTERNATIVOS LISTOS');
    logger.info('=====================================================');
    reporte.forEach((l) => logger.info(l));
    logger.info('Cómo probarlo: entra como paciente → "Reservar cita" → elige al médico');
    logger.info('referente y pon una de las fechas indicadas. Como ese día no atiende,');
    logger.info('aparecerán los alternativos de la misma especialidad con sus horarios.');
    logger.info('=====================================================\n');
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
