import { describe, it, expect } from 'vitest';
import { calcularTotales, porcentajeAusentismo, redondear2 } from './billing';

describe('redondear2', () => {
  it('redondea a 2 decimales', () => {
    expect(redondear2(1.005)).toBe(1.01);
    expect(redondear2(130 * 0.18)).toBe(23.4);
    expect(redondear2(10)).toBe(10);
  });
});

describe('calcularTotales', () => {
  it('suma ítems y aplica el impuesto', () => {
    const items = [
      { cantidad: 1, precioUnitario: 80 },
      { cantidad: 2, precioUnitario: 25 },
    ];
    const t = calcularTotales(items, 18);
    expect(t.subtotal).toBe(130);
    expect(t.impuesto).toBe(23.4);
    expect(t.total).toBe(153.4);
  });

  it('con impuesto 0 el total es el subtotal', () => {
    const t = calcularTotales([{ cantidad: 3, precioUnitario: 10 }], 0);
    expect(t.subtotal).toBe(30);
    expect(t.impuesto).toBe(0);
    expect(t.total).toBe(30);
  });

  it('lista vacía da todo en cero', () => {
    const t = calcularTotales([], 18);
    expect(t).toEqual({ subtotal: 0, impuesto: 0, total: 0 });
  });

  it('maneja precios con decimales sin acumular error', () => {
    const t = calcularTotales([{ cantidad: 3, precioUnitario: 19.99 }], 18);
    expect(t.subtotal).toBe(59.97);
    expect(t.impuesto).toBe(10.79);
    expect(t.total).toBe(70.76);
  });
});

describe('porcentajeAusentismo', () => {
  it('calcula el porcentaje sobre citas con desenlace', () => {
    expect(porcentajeAusentismo(8, 2)).toBe(20);
    expect(porcentajeAusentismo(3, 1)).toBe(25);
  });

  it('sin citas con desenlace devuelve 0', () => {
    expect(porcentajeAusentismo(0, 0)).toBe(0);
  });

  it('ignora reservadas/canceladas (no se pasan a la función)', () => {
    expect(porcentajeAusentismo(10, 0)).toBe(0);
    expect(porcentajeAusentismo(0, 5)).toBe(100);
  });
});
