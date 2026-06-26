/**
 * Lógica pura (sin dependencias de base de datos) para el cálculo de
 * disponibilidad de la agenda. Aislada aquí para poder testearla con Vitest.
 */

export interface Franja {
  diaSemana: number; // 0=domingo ... 6=sábado
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
}

export interface BloqueoLite {
  desde: Date;
  hasta: Date;
}

export interface Slot {
  hora: string; // "HH:mm"
  fechaHora: string; // ISO
  disponible: boolean;
}

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const toHHmm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Zona horaria fija de la clínica (Perú, UTC-5, sin horario de verano). */
export const CLINIC_OFFSET = '-05:00';

/**
 * Construye el instante UTC correcto para una hora de pared de la clínica.
 * Así "10:00" siempre significa 10:00 en Perú, sin importar dónde corra el
 * servidor (Render usa UTC) ni desde dónde se mire.
 */
export const buildDate = (fecha: string, hhmm: string): Date =>
  new Date(`${fecha}T${hhmm}:00${CLINIC_OFFSET}`);

/** Día de la semana (0-6) y minutos del día, EN HORA DE LA CLÍNICA, de un instante. */
export const enHoraClinica = (d: Date): { diaSemana: number; minutos: number } => {
  const lima = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return { diaSemana: lima.getUTCDay(), minutos: lima.getUTCHours() * 60 + lima.getUTCMinutes() };
};

/** ¿El intervalo [t, t+dur) solapa con algún bloqueo? */
export const enBloqueo = (t: number, durMin: number, bloqueos: BloqueoLite[]): boolean =>
  bloqueos.some((b) => t < b.hasta.getTime() && t + durMin * 60_000 > b.desde.getTime());

/** ¿El slot (en minutos del día) cae completo dentro de alguna franja del día? */
export const dentroDeFranja = (
  diaSemana: number,
  minutosInicio: number,
  durMin: number,
  franjas: Franja[],
): boolean =>
  franjas.some(
    (h) =>
      h.diaSemana === diaSemana &&
      minutosInicio >= toMinutes(h.horaInicio) &&
      minutosInicio + durMin <= toMinutes(h.horaFin),
  );

/**
 * Genera los slots de un día a partir de las franjas del médico,
 * marcando disponibilidad según citas ocupadas, bloqueos y el momento actual.
 */
export function computeSlots(params: {
  fecha: string;
  franjasDelDia: Franja[];
  duracionSlotMin: number;
  ocupados: Set<number>;
  bloqueos: BloqueoLite[];
  ahora: number;
}): Slot[] {
  const { fecha, franjasDelDia, duracionSlotMin: dur, ocupados, bloqueos, ahora } = params;
  const slots: Slot[] = [];

  for (const franja of franjasDelDia) {
    const inicio = toMinutes(franja.horaInicio);
    const fin = toMinutes(franja.horaFin);
    for (let min = inicio; min + dur <= fin; min += dur) {
      const hora = toHHmm(min);
      const fechaHora = buildDate(fecha, hora);
      const t = fechaHora.getTime();
      const disponible = !ocupados.has(t) && !enBloqueo(t, dur, bloqueos) && t > ahora;
      slots.push({ hora, fechaHora: fechaHora.toISOString(), disponible });
    }
  }

  slots.sort((a, b) => a.hora.localeCompare(b.hora));
  return slots;
}
