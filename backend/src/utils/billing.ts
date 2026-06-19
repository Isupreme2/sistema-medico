/**
 * Lógica de cálculo PURA (sin DB) para facturación y métricas.
 * Extraída para poder testearla de forma aislada con Vitest.
 */

export interface ItemFacturable {
  cantidad: number;
  precioUnitario: number;
}

export interface Totales {
  subtotal: number;
  impuesto: number;
  total: number;
}

/** Redondea a 2 decimales evitando errores de coma flotante. */
export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula subtotal, impuesto (según %) y total de una lista de ítems.
 * Todo redondeado a 2 decimales.
 */
export function calcularTotales(items: ItemFacturable[], impuestoPct: number): Totales {
  const subtotal = redondear2(
    items.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0),
  );
  const impuesto = redondear2(subtotal * (impuestoPct / 100));
  const total = redondear2(subtotal + impuesto);
  return { subtotal, impuesto, total };
}

/**
 * Tasa de ausentismo: citas en las que el paciente no asistió sobre el total
 * de citas con desenlace (atendidas + no asistió). Devuelve un entero 0-100.
 */
export function porcentajeAusentismo(atendidas: number, noAsistio: number): number {
  const base = atendidas + noAsistio;
  if (base <= 0) return 0;
  return Math.round((noAsistio / base) * 100);
}
