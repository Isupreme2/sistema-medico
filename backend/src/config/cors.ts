import { env } from './env';

/**
 * Política de CORS compartida por el API HTTP (Express) y por Socket.io.
 *
 * Se permite:
 *   - Cualquier origen listado en CORS_ORIGIN (coma-separado, para producción:
 *     ej. la URL de Vercel del frontend desplegado).
 *   - localhost / 127.0.0.1 en cualquier puerto (desarrollo local).
 *   - Subdominios *.app.github.dev (GitHub Codespaces).
 *
 * Antes el origen era un único string fijo ("http://localhost:4200"), por lo
 * que el navegador bloqueaba las peticiones desde Codespaces o desde el
 * frontend desplegado. Ahora es dinámico.
 */

// Orígenes explícitos (coma-separados) desde la variable de entorno.
const allowList = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Patrones dinámicos permitidos sin necesidad de configurarlos uno a uno.
const dynamicPatterns: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https?:\/\/([a-z0-9-]+\.)*app\.github\.dev$/i,
];

export function isOriginAllowed(origin?: string): boolean {
  // Peticiones sin cabecera Origin (curl, same-origin, health checks): se permiten.
  if (!origin) return true;
  if (allowList.includes(origin)) return true;
  return dynamicPatterns.some((re) => re.test(origin));
}

type OriginCallback = (err: Error | null, allow?: boolean) => void;

/**
 * Función `origin` compatible tanto con el paquete `cors` (Express) como con
 * la opción `cors.origin` de Socket.io.
 */
export function corsOrigin(origin: string | undefined, callback: OriginCallback): void {
  if (isOriginAllowed(origin)) return callback(null, true);
  callback(new Error(`Origen no permitido por CORS: ${origin}`));
}
