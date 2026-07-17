import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * Enlace firmado y de vida corta para que el paciente abra su receta completa
 * desde el chat (WhatsApp) sin iniciar sesión. El token lleva un `purpose`
 * propio para que no pueda confundirse con un access token.
 */
const PURPOSE = 'receta-link';

interface LinkPayload {
  rid: string;
  purpose: string;
}

export function firmarLinkReceta(recetaId: string): string {
  const options = { expiresIn: env.RECETA_LINK_EXPIRES } as SignOptions;
  return jwt.sign({ rid: recetaId, purpose: PURPOSE }, env.JWT_ACCESS_SECRET, options);
}

/** Devuelve el recetaId si el token es válido y del propósito correcto; si no, null. */
export function verificarLinkReceta(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as LinkPayload;
    return payload.purpose === PURPOSE ? payload.rid : null;
  } catch {
    return null;
  }
}

/** URL pública absoluta que abre la vista de la receta. */
export function urlLinkReceta(recetaId: string): string {
  return `${env.PUBLIC_URL}${env.API_PREFIX}/prescriptions/link/${firmarLinkReceta(recetaId)}`;
}
