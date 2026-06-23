/**
 * Resuelve la URL base del API en TIEMPO DE EJECUCIÓN según el host actual.
 *
 * Motivo: el `apiUrl` no puede estar fijo en build-time porque el mismo build
 * tiene que funcionar en distintos entornos sin recompilar:
 *   - Local:        http://localhost:4000/api/v1
 *   - Codespaces:   el frontend corre en "<algo>-4200.app.github.dev"; el
 *                   backend vive en el MISMO host pero con el puerto 4000
 *                   ("<algo>-4000.app.github.dev"). Antes esto fallaba porque
 *                   el front llamaba a "localhost:4000", que en el navegador
 *                   apunta a la PC del usuario, no al contenedor remoto.
 *   - Despliegue:   se puede inyectar `window.__API_URL__` (ej. en Vercel) con
 *                   la URL completa del backend (incluyendo /api/v1).
 */
function resolveApiUrl(): string {
  const FALLBACK = 'http://localhost:4000/api/v1';

  // Durante prerender/SSR o tests no hay window: usa el fallback.
  if (typeof window === 'undefined' || !window.location) return FALLBACK;

  // 1) Override explícito inyectado en el despliegue (máxima prioridad).
  const override = (window as unknown as { __API_URL__?: string }).__API_URL__;
  if (override) return override;

  const { protocol, hostname, host, origin } = window.location;

  // 2) GitHub Codespaces: mismo host, cambiando el puerto 4200 -> 4000.
  if (hostname.endsWith('.app.github.dev')) {
    return `${protocol}//${host.replace(/-4200\./, '-4000.')}/api/v1`;
  }

  // 3) Local: backend en el puerto 4000 del mismo hostname.
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:4000/api/v1`;
  }

  // 4) Otro despliegue sin override: asume backend en el mismo origen.
  return `${origin}/api/v1`;
}

export const environment = {
  production: false,
  apiUrl: resolveApiUrl(),
};
