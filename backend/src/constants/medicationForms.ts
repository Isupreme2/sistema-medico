/**
 * Catálogo de formas farmacéuticas. Cada forma define la unidad de la
 * "cantidad a tomar" y si admite fracciones (media pastilla, etc.).
 * Es la base para que la receta sea estructurada y el futuro chatbot pueda
 * calcular y redactar cada toma.
 */
export interface FormaMedicamento {
  forma: string;
  unidad: string;
  permiteFraccion: boolean;
}

export const FORMAS_MEDICAMENTO: readonly FormaMedicamento[] = [
  { forma: 'Pastilla', unidad: 'tableta(s)', permiteFraccion: true },
  { forma: 'Cápsula', unidad: 'cápsula(s)', permiteFraccion: true },
  { forma: 'Jarabe', unidad: 'ml', permiteFraccion: false },
  { forma: 'Suspensión', unidad: 'ml', permiteFraccion: false },
  { forma: 'Gotas', unidad: 'gota(s)', permiteFraccion: false },
  { forma: 'Inyección', unidad: 'ml', permiteFraccion: false },
  { forma: 'Inhalador', unidad: 'disparo(s)', permiteFraccion: false },
  { forma: 'Crema', unidad: 'aplicación', permiteFraccion: false },
  { forma: 'Supositorio', unidad: 'unidad(es)', permiteFraccion: true },
];

export const FORMAS: string[] = FORMAS_MEDICAMENTO.map((f) => f.forma);

/** Unidad de dosis correspondiente a una forma (fallback genérico). */
export function unidadDeForma(forma?: string): string {
  return FORMAS_MEDICAMENTO.find((f) => f.forma === forma)?.unidad ?? 'unidad(es)';
}

/** Momento de la toma respecto a las comidas. */
export const MOMENTOS = ['indiferente', 'ayunas', 'con_alimentos', 'despues_comer'] as const;
export type Momento = (typeof MOMENTOS)[number];

export function momentoLabel(m?: string): string {
  switch (m) {
    case 'ayunas':
      return 'En ayunas';
    case 'con_alimentos':
      return 'Con alimentos';
    case 'despues_comer':
      return 'Después de comer';
    default:
      return '';
  }
}
