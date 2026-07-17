import { describe, it, expect } from 'vitest';
import { calcularTomas, MAX_HORIZONTE_DIAS } from './toma.schedule';

describe('calcularTomas', () => {
  it('genera una toma por día para un horario único', () => {
    const inicio = new Date('2026-07-17T13:00:00-05:00');
    const tomas = calcularTomas(inicio, ['08:00'], 3);
    // Día 0 a las 08:00 es anterior al inicio (13:00) → se descarta.
    expect(tomas).toHaveLength(2);
  });

  it('respeta la zona horaria de Lima (UTC-5)', () => {
    const inicio = new Date('2026-07-17T00:00:00-05:00');
    const [primera] = calcularTomas(inicio, ['08:00'], 1);
    // 08:00 en Lima == 13:00 UTC.
    expect(primera.toISOString()).toBe('2026-07-17T13:00:00.000Z');
  });

  it('maneja doble horario (mañana y noche)', () => {
    const inicio = new Date('2026-07-17T00:00:00-05:00');
    const tomas = calcularTomas(inicio, ['08:00', '20:00'], 2);
    expect(tomas).toHaveLength(4);
    // 20:00 Lima == 01:00 UTC del día siguiente.
    expect(tomas[1].toISOString()).toBe('2026-07-18T01:00:00.000Z');
    expect(tomas.map((t) => t.getTime())).toEqual(
      [...tomas.map((t) => t.getTime())].sort((a, b) => a - b),
    );
  });

  it('descarta tomas anteriores al inicio del tratamiento', () => {
    const inicio = new Date('2026-07-17T21:00:00-05:00');
    const tomas = calcularTomas(inicio, ['08:00', '20:00'], 1);
    // Ambas del día 0 son anteriores a las 21:00 → ninguna.
    expect(tomas).toHaveLength(0);
  });

  it('trunca el horizonte a MAX_HORIZONTE_DIAS', () => {
    const inicio = new Date('2026-01-01T00:00:00-05:00');
    const tomas = calcularTomas(inicio, ['08:00'], 400);
    expect(tomas).toHaveLength(MAX_HORIZONTE_DIAS);
  });

  it('devuelve vacío sin horarios o con días inválidos', () => {
    const inicio = new Date('2026-07-17T00:00:00-05:00');
    expect(calcularTomas(inicio, [], 5)).toHaveLength(0);
    expect(calcularTomas(inicio, ['08:00'], 0)).toHaveLength(0);
  });
});
