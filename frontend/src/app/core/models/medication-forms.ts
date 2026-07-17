/**
 * Catálogo de formas farmacéuticas para el formulario de receta.
 * Espeja el catálogo del backend (constants/medicationForms.ts).
 */
export interface FormaMedicamento {
  forma: string;
  unidad: string;
  permiteFraccion: boolean;
}

export const FORMAS_MEDICAMENTO: FormaMedicamento[] = [
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

export function unidadDeForma(forma?: string): string {
  return FORMAS_MEDICAMENTO.find((f) => f.forma === forma)?.unidad ?? 'unidad(es)';
}

export interface MomentoOpcion {
  valor: string;
  label: string;
}

export const MOMENTOS: MomentoOpcion[] = [
  { valor: 'indiferente', label: 'Indiferente' },
  { valor: 'ayunas', label: 'En ayunas' },
  { valor: 'con_alimentos', label: 'Con alimentos' },
  { valor: 'despues_comer', label: 'Después de comer' },
];

export function momentoLabel(valor?: string): string {
  return MOMENTOS.find((m) => m.valor === valor && valor !== 'indiferente')?.label ?? '';
}

/** Presets de horarios frecuentes (hora local). */
export interface PresetHorario {
  label: string;
  horas: string[];
}

export const PRESETS_HORARIO: PresetHorario[] = [
  { label: '1 vez/día', horas: ['08:00'] },
  { label: 'Cada 12 h', horas: ['08:00', '20:00'] },
  { label: 'Cada 8 h', horas: ['08:00', '16:00', '00:00'] },
  { label: 'Cada 6 h', horas: ['06:00', '12:00', '18:00', '00:00'] },
];
