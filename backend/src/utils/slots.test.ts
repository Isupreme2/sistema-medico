import { describe, it, expect } from 'vitest';
import {
  buildDate,
  computeSlots,
  dentroDeFranja,
  enBloqueo,
  toHHmm,
  toMinutes,
  type Franja,
} from './slots';

describe('helpers de tiempo', () => {
  it('toMinutes convierte HH:mm a minutos', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('23:59')).toBe(1439);
  });

  it('toHHmm es la inversa de toMinutes', () => {
    expect(toHHmm(0)).toBe('00:00');
    expect(toHHmm(570)).toBe('09:30');
    expect(toHHmm(toMinutes('14:45'))).toBe('14:45');
  });

  it('buildDate combina fecha y hora locales', () => {
    const d = buildDate('2026-06-22', '09:00');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('enBloqueo', () => {
  const bloqueo = { desde: buildDate('2026-06-22', '10:00'), hasta: buildDate('2026-06-22', '11:00') };

  it('detecta un slot que cae dentro del bloqueo', () => {
    const t = buildDate('2026-06-22', '10:20').getTime();
    expect(enBloqueo(t, 20, [bloqueo])).toBe(true);
  });

  it('no marca un slot fuera del bloqueo', () => {
    const t = buildDate('2026-06-22', '09:00').getTime();
    expect(enBloqueo(t, 20, [bloqueo])).toBe(false);
  });

  it('detecta solapamiento parcial al final del slot', () => {
    // slot 09:50-10:10 solapa con bloqueo que empieza 10:00
    const t = buildDate('2026-06-22', '09:50').getTime();
    expect(enBloqueo(t, 20, [bloqueo])).toBe(true);
  });
});

describe('dentroDeFranja', () => {
  const franjas: Franja[] = [{ diaSemana: 1, horaInicio: '09:00', horaFin: '13:00' }];

  it('acepta un slot dentro de la franja', () => {
    expect(dentroDeFranja(1, toMinutes('09:00'), 20, franjas)).toBe(true);
    expect(dentroDeFranja(1, toMinutes('12:40'), 20, franjas)).toBe(true);
  });

  it('rechaza un slot que se pasa del fin de la franja', () => {
    expect(dentroDeFranja(1, toMinutes('12:50'), 20, franjas)).toBe(false);
  });

  it('rechaza un día sin franja', () => {
    expect(dentroDeFranja(2, toMinutes('09:00'), 20, franjas)).toBe(false);
  });
});

describe('computeSlots', () => {
  const fecha = '2026-06-22';
  const franjasDelDia: Franja[] = [{ diaSemana: 1, horaInicio: '09:00', horaFin: '13:00' }];
  const ayer = 0; // ahora=0 → nada está en el pasado

  it('genera la cantidad correcta de slots (4h / 20min = 12)', () => {
    const slots = computeSlots({
      fecha,
      franjasDelDia,
      duracionSlotMin: 20,
      ocupados: new Set(),
      bloqueos: [],
      ahora: ayer,
    });
    expect(slots).toHaveLength(12);
    expect(slots[0].hora).toBe('09:00');
    expect(slots.every((s) => s.disponible)).toBe(true);
  });

  it('marca como ocupado un slot reservado', () => {
    const ocupados = new Set([buildDate(fecha, '09:00').getTime()]);
    const slots = computeSlots({
      fecha,
      franjasDelDia,
      duracionSlotMin: 20,
      ocupados,
      bloqueos: [],
      ahora: ayer,
    });
    expect(slots.find((s) => s.hora === '09:00')?.disponible).toBe(false);
    expect(slots.find((s) => s.hora === '09:20')?.disponible).toBe(true);
  });

  it('marca como no disponible los slots dentro de un bloqueo', () => {
    const bloqueos = [
      { desde: buildDate(fecha, '10:00'), hasta: buildDate(fecha, '11:00') },
    ];
    const slots = computeSlots({
      fecha,
      franjasDelDia,
      duracionSlotMin: 20,
      ocupados: new Set(),
      bloqueos,
      ahora: ayer,
    });
    expect(slots.find((s) => s.hora === '10:00')?.disponible).toBe(false);
    expect(slots.find((s) => s.hora === '10:40')?.disponible).toBe(false);
    expect(slots.find((s) => s.hora === '11:00')?.disponible).toBe(true);
  });

  it('marca como no disponible los slots en el pasado', () => {
    const ahora = buildDate(fecha, '10:00').getTime();
    const slots = computeSlots({
      fecha,
      franjasDelDia,
      duracionSlotMin: 20,
      ocupados: new Set(),
      bloqueos: [],
      ahora,
    });
    expect(slots.find((s) => s.hora === '09:00')?.disponible).toBe(false);
    expect(slots.find((s) => s.hora === '11:00')?.disponible).toBe(true);
  });

  it('no genera slots para un día sin franjas', () => {
    const slots = computeSlots({
      fecha,
      franjasDelDia: [],
      duracionSlotMin: 20,
      ocupados: new Set(),
      bloqueos: [],
      ahora: ayer,
    });
    expect(slots).toHaveLength(0);
  });
});
