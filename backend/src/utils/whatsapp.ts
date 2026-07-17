import { env } from '../config/env';
import { logger } from './logger';

/**
 * Cliente de WhatsApp Cloud API (Meta). Si no hay token o phone id, cae a modo
 * "log": imprime el mensaje en consola en vez de llamar a Meta. Así el sistema
 * funciona en desarrollo sin credenciales reales (igual que el mailer).
 * Nunca lanza: un fallo de mensajería no debe tumbar el flujo de negocio.
 */

let modeChecked = false;
let live = false;

export function whatsappMode(): 'live' | 'log' {
  if (!modeChecked) {
    live = env.WHATSAPP_ENABLED && !!env.WHATSAPP_TOKEN && !!env.WHATSAPP_PHONE_ID;
    modeChecked = true;
  }
  return live ? 'live' : 'log';
}

/**
 * Normaliza a formato E.164 sin '+': solo dígitos. A un móvil peruano (9
 * dígitos que empiezan en 9) le antepone el código de país configurado.
 */
export function normalizarTelefono(telefono?: string): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 9 && d.startsWith('9')) d = env.WHATSAPP_DEFAULT_COUNTRY + d;
  return d;
}

async function postGraph(payload: unknown): Promise<boolean> {
  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    logger.error(`📲 WhatsApp API ${res.status}: ${detalle}`);
    return false;
  }
  return true;
}

export interface WhatsappText {
  to: string;
  body: string;
}

/** Envía un mensaje de texto (válido dentro de la ventana de servicio de 24 h). */
export async function sendWhatsappText(input: WhatsappText): Promise<boolean> {
  const to = normalizarTelefono(input.to);
  if (!to) return false;

  if (whatsappMode() === 'log') {
    logger.info(`📲 [whatsapp:log] Para: ${to}\n${input.body}`);
    return true;
  }

  try {
    return await postGraph({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: true, body: input.body },
    });
  } catch (err) {
    logger.error('📲 Fallo al enviar WhatsApp:', err);
    return false;
  }
}

/**
 * Envía una plantilla pre-aprobada. Necesario para mensajes iniciados por el
 * negocio fuera de la ventana de 24 h (el caso real del recordatorio).
 * `params` alimenta los {{1}}, {{2}}… del cuerpo de la plantilla.
 */
export async function sendWhatsappTemplate(
  to0: string,
  template: string,
  params: string[],
  lang = 'es',
): Promise<boolean> {
  const to = normalizarTelefono(to0);
  if (!to) return false;

  if (whatsappMode() === 'log') {
    logger.info(`📲 [whatsapp:log] (plantilla ${template}) Para: ${to}\nParams: ${params.join(' | ')}`);
    return true;
  }

  try {
    return await postGraph({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: lang },
        components: [
          { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
        ],
      },
    });
  } catch (err) {
    logger.error('📲 Fallo al enviar plantilla WhatsApp:', err);
    return false;
  }
}
