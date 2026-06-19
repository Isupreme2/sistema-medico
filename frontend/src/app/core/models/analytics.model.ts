export interface Overview {
  totales: { citas: number; pacientes: number; medicos: number };
  citasPorEstado: Record<string, number>;
  ausentismoPct: number;
  ingresos: { pendiente: number; pagada: number; anulada: number; total: number };
  citasPorDia: { fecha: string; count: number }[];
  topMedicos: { count: number; nombre: string }[];
}
