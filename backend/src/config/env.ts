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
  /** Duración del access token = duración efectiva de la sesión de trabajo. */
  JWT_ACCESS_EXPIRES: z.string().default('12h'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  /** URL pública del API (para el QR de verificación de recetas). */
  PUBLIC_URL: z.string().default('http://localhost:4000'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  /**
   * Política SameSite de la cookie de refresh.
   *   - 'strict' (default): correcto en local / mismo sitio.
   *   - 'none': obligatorio para que la cookie viaje cross-site (frontend y
   *     backend en dominios distintos, ej. Vercel ↔ Render). Exige HTTPS, por
   *     lo que fuerza Secure=true automáticamente.
   */
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),

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

  /** Dominio del servidor Jitsi para la teleconsulta (video embebido). */
  JITSI_DOMAIN: z.string().default('meet.jit.si'),

  /** Cron de recordatorios (por defecto cada 15 min). */
  REMINDER_CRON: z.string().default('*/15 * * * *'),
  /** Ventana (horas) hacia adelante para enviar recordatorios de citas. */
  REMINDER_WINDOW_HOURS: z.coerce.number().default(24),
  /** Habilita/inhabilita el job de recordatorios. */
  REMINDERS_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  /** Cron del recordatorio de tomas de medicamentos (por defecto cada minuto). */
  TOMA_REMINDER_CRON: z.string().default('* * * * *'),
  /** Minutos de antelación con que se avisa cada toma (el "en 5 minutos"). */
  TOMA_LEAD_MIN: z.coerce.number().default(5),
  /** Margen (min) tras la hora programada antes de dar una toma por omitida. */
  TOMA_GRACE_MIN: z.coerce.number().default(30),

  /**
   * WhatsApp Cloud API (Meta). Todo opcional: si falta el token o el phone id,
   * el canal cae a modo "log" (imprime el mensaje) para funcionar sin
   * credenciales reales, igual que el mailer.
   */
  WHATSAPP_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_ID: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v21.0'),
  /** Plantilla pre-aprobada para el recordatorio de toma (mensajes fuera de 24 h). */
  WHATSAPP_TEMPLATE_TOMA: z.string().optional(),
  /** Código de país que se antepone a móviles locales sin prefijo (Perú = 51). */
  WHATSAPP_DEFAULT_COUNTRY: z.string().default('51'),

  /** Vigencia del enlace firmado para ver la receta desde el chat. */
  RECETA_LINK_EXPIRES: z.string().default('7d'),

  /**
   * Análisis clínico asistido por IA (Claude / Anthropic). Opcional: si falta
   * ANTHROPIC_API_KEY, el módulo cae a modo "demo" (devuelve un análisis
   * simulado) para funcionar sin credenciales ni costo, igual que el mailer.
   * NO es un diagnóstico: es apoyo a la evaluación del médico.
   */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Modelo a usar (el más capaz por defecto). */
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-8'),
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
