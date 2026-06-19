import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;
let usingRealSmtp = false;

/**
 * Crea (perezosamente) el transporte SMTP. Si no hay SMTP_HOST configurado,
 * devuelve null y el envío cae a modo "log": el correo se imprime en consola.
 * Así el sistema funciona en desarrollo sin un servidor de correo real.
 */
function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  usingRealSmtp = true;
  return transporter;
}

/**
 * Envía un correo. Nunca lanza: un fallo de email no debe tumbar el flujo
 * de negocio (reserva, receta, etc.). Devuelve true si se envió/registró.
 */
export async function sendMail(input: MailInput): Promise<boolean> {
  const tx = getTransporter();

  if (!tx) {
    logger.info(
      `📧 [mailer:log] Para: ${input.to} | Asunto: ${input.subject}\n${input.text ?? input.html}`,
    );
    return true;
  }

  try {
    await tx.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    logger.info(`📧 Correo enviado a ${input.to} (${input.subject})`);
    return true;
  } catch (err) {
    logger.error(`📧 Fallo al enviar correo a ${input.to}:`, err);
    return false;
  }
}

export function mailerMode(): 'smtp' | 'log' {
  getTransporter();
  return usingRealSmtp ? 'smtp' : 'log';
}

/** Plantilla HTML mínima y consistente para los correos del sistema. */
export function emailLayout(titulo: string, cuerpoHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#2563eb;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:18px;">${env.APP_NAME}</h1>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;">
      <h2 style="margin-top:0;font-size:18px;color:#1e293b;">${titulo}</h2>
      ${cuerpoHtml}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
      Este es un mensaje automático, por favor no respondas a este correo.
    </p>
  </div>
</body></html>`;
}
