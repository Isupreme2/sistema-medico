import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Esquema de validación de variables de entorno.
 * Si falta una variable crítica, el proceso falla al arrancar (fail-fast),
 * en lugar de explotar a mitad de una request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI es obligatorio'),

  /**
   * DNS de respaldo (coma-separados). Workaround para entornos donde el
   * resolver interno de Node (c-ares) falla al resolver el SRV de Atlas
   * (ECONNREFUSED). Ej: "8.8.8.8,1.1.1.1". Opcional.
   */
  DNS_SERVERS: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  /** URL pública del API (para el QR de verificación de recetas). */
  PUBLIC_URL: z.string().default('http://localhost:4000'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  APP_NAME: z.string().default('Sistema Medico EHR'),

  /**
   * SMTP para recordatorios y notificaciones por email. Todo opcional:
   * si falta SMTP_HOST, el mailer cae a modo "log" (imprime el correo en
   * consola) para no romper el desarrollo sin un servidor de correo real.
   */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Sistema Médico EHR <no-reply@ehr.dev>'),

  /** URL del frontend (para enlaces en los correos). */
  FRONTEND_URL: z.string().default('http://localhost:4200'),

  /** Cron de recordatorios (por defecto cada 15 min). */
  REMINDER_CRON: z.string().default('*/15 * * * *'),
  /** Ventana (horas) hacia adelante para enviar recordatorios de citas. */
  REMINDER_WINDOW_HOURS: z.coerce.number().default(24),
  /** Habilita/inhabilita el job de recordatorios. */
  REMINDERS_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variables de entorno inválidas:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
