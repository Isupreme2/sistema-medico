/**
 * Cálculo puro de los instantes de cada toma. Aislado de Mongo para poder
 * probarlo. Los horarios ("HH:mm") son hora de pared local de Lima (América/Lima,
 * UTC-5 sin horario de verano), así que se resuelven con un offset fijo.
 */

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000; // Lima = UTC-5
const DAY_MS = 24 * 60 * 60 * 1000;

/** Límite de días a materializar, para evitar inserciones patológicas. */
export const MAX_HORIZONTE_DIAS = 120;

/** Instante UTC de la medianoche local (Lima) del día que contiene a `fecha`. */
function limaMedianocheUTC(fecha: Date): Date {
  const lima = new Date(fecha.getTime() - LIMA_OFFSET_MS);
  const y = lima.getUTCFullYear();
  const mo = lima.getUTCMonth();
  const d = lima.getUTCDate();
  // Medianoche local (00:00 -05:00) = 05:00 UTC de ese día.
  return new Date(Date.UTC(y, mo, d, 0, 0, 0) + LIMA_OFFSET_MS);
}

/**
 * Devuelve, en orden ascendente, los instantes (UTC) de todas las tomas de un
 * medicamento: por cada uno de los `dias`, uno por cada horario en `horas`.
 * Se descartan las tomas anteriores al inicio del tratamiento.
 */
export function calcularTomas(inicio: Date, horas: string[], dias: number): Date[] {
  if (!horas.length || dias < 1) return [];

  const totalDias = Math.min(dias, MAX_HORIZONTE_DIAS);
  const base = limaMedianocheUTC(inicio);
  const inicioMs = inicio.getTime();
  const instantes: Date[] = [];

  for (let d = 0; d < totalDias; d++) {
    for (const hora of horas) {
      const [hh, mm] = hora.split(':').map(Number);
      const t = base.getTime() + d * DAY_MS + hh * 60 * 60 * 1000 + mm * 60 * 1000;
      if (t >= inicioMs) instantes.push(new Date(t));
    }
  }

  return instantes.sort((a, b) => a.getTime() - b.getTime());
}
