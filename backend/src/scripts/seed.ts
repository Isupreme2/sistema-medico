import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { User } from '../models/user.model';
import { UserRole } from '../constants/roles';
import { logger } from '../utils/logger';

/**
 * Crea cuentas demo para cada rol. Idempotente: si ya existen, no las duplica.
 * Ejecutar con: npm run seed
 */
const DEMO_USERS = [
  {
    email: 'admin@ehr.dev',
    password: 'Admin1234',
    role: UserRole.ADMIN,
    nombre: 'Ana',
    apellido: 'Administradora',
  },
  {
    email: 'medico@ehr.dev',
    password: 'Medico1234',
    role: UserRole.MEDICO,
    nombre: 'Carlos',
    apellido: 'Pérez',
  },
  {
    email: 'paciente@ehr.dev',
    password: 'Paciente1234',
    role: UserRole.PACIENTE,
    nombre: 'Juan',
    apellido: 'Gómez',
  },
];

async function seed(): Promise<void> {
  await connectDatabase();

  for (const u of DEMO_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      logger.info(`= ya existe: ${u.email} (${u.role})`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 12);
    await User.create({
      email: u.email,
      passwordHash,
      role: u.role,
      nombre: u.nombre,
      apellido: u.apellido,
    });
    logger.info(`+ creado: ${u.email} / ${u.password} (${u.role})`);
  }

  logger.info('✅ Seed completado');
  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Error en seed:', err);
  process.exit(1);
});
