import { IPrescription } from '../../models/prescription.model';
import { momentoLabel } from '../../constants/medicationForms';
import { env } from '../../config/env';

interface PersonaPop {
  nombre: string;
  apellido: string;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const shell = (titulo: string, cuerpo: string): string => `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(titulo)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#f1f5f9; color:#0f172a; font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:20px; }
  .card { background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(15,23,42,.08); }
  .head { background:#2563eb; color:#fff; padding:20px 24px; }
  .head h1 { margin:0; font-size:18px; }
  .head p { margin:4px 0 0; font-size:13px; opacity:.85; }
  .body { padding:20px 24px; }
  .meta { font-size:13px; color:#475569; margin:0 0 16px; }
  .med { border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; margin-bottom:10px; }
  .med .nom { font-weight:700; font-size:15px; color:#1e293b; }
  .med .det { font-size:13px; color:#475569; margin-top:4px; }
  .ind { background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:12px 14px; font-size:14px; color:#1e40af; margin-top:6px; }
  .codigo { font-family:monospace; font-weight:700; color:#2563eb; }
  .foot { text-align:center; color:#94a3b8; font-size:12px; margin-top:14px; }
  @media (prefers-color-scheme: dark) {
    body { background:#0b1220; color:#e2e8f0; }
    .card { background:#111a2e; box-shadow:none; }
    .med { border-color:#1e293b; } .med .nom { color:#e2e8f0; } .med .det, .meta { color:#94a3b8; }
    .ind { background:#0f2038; border-color:#1e3a5f; color:#93c5fd; }
  }
</style>
</head><body><div class="wrap">${cuerpo}
<p class="foot">${esc(env.APP_NAME)} · Documento generado electrónicamente</p>
</div></body></html>`;

/** Página pública de la receta (la que abre el enlace del chat). */
export function renderRecetaHtml(receta: IPrescription): string {
  const medico = receta.medicoId as unknown as PersonaPop;
  const paciente = receta.pacienteId as unknown as PersonaPop;
  const fecha = new Date(receta.emitidaEn).toLocaleString('es-PE', { timeZone: 'America/Lima' });

  const meds = receta.medicamentos
    .map((m) => {
      const dosis = [m.cantidad, m.unidad].filter(Boolean).join(' ');
      const linea2 = [
        m.concentracion,
        dosis && `Tomar: ${dosis}`,
        m.frecuencia,
        m.duracion,
        momentoLabel(m.momento),
      ]
        .filter(Boolean)
        .map(esc)
        .join(' · ');
      return `<div class="med"><div class="nom">${esc(m.nombre)}</div><div class="det">${linea2}</div></div>`;
    })
    .join('');

  const indicaciones = receta.indicaciones
    ? `<div class="ind"><strong>Indicaciones generales:</strong> ${esc(receta.indicaciones)}</div>`
    : '';

  return shell(
    `Receta ${receta.codigo}`,
    `<div class="card">
      <div class="head"><h1>Receta médica digital</h1><p>Código <span class="codigo" style="color:#fff">${esc(receta.codigo)}</span></p></div>
      <div class="body">
        <p class="meta">
          Paciente: <strong>${esc(paciente?.nombre)} ${esc(paciente?.apellido)}</strong><br>
          Médico: Dr(a). ${esc(medico?.nombre)} ${esc(medico?.apellido)}<br>
          Emitida: ${esc(fecha)}
        </p>
        ${meds}
        ${indicaciones}
      </div>
    </div>`,
  );
}

/** Página de enlace inválido o expirado. */
export function renderLinkInvalidoHtml(): string {
  return shell(
    'Enlace no válido',
    `<div class="card"><div class="head"><h1>Enlace no válido</h1></div>
     <div class="body"><p class="meta">Este enlace de receta no es válido o ya expiró.
     Ingresa a tu portal para ver tus recetas.</p></div></div>`,
  );
}
