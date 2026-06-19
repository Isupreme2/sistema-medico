/**
 * Seguridad farmacológica (lógica pura, testeable).
 * - Detecta medicamentos que chocan con alergias del paciente.
 * - Detecta interacciones conocidas entre los medicamentos recetados.
 *
 * Nota: el dataset de interacciones es ilustrativo (no clínico-exhaustivo);
 * en producción se conectaría a una base como RxNorm/DrugBank.
 */

export interface MedicamentoLite {
  nombre: string;
}

export interface AlergiaConflicto {
  medicamento: string;
  alergia: string;
}

export interface Interaccion {
  entre: [string, string];
  descripcion: string;
}

export interface SafetyResult {
  alergias: AlergiaConflicto[];
  interacciones: Interaccion[];
}

/** Pares de fármacos con interacción conocida (palabras clave en minúscula). */
const INTERACCIONES: { a: string; b: string; descripcion: string }[] = [
  { a: 'warfarina', b: 'aspirina', descripcion: 'Aumenta el riesgo de sangrado' },
  { a: 'warfarina', b: 'ibuprofeno', descripcion: 'Aumenta el riesgo de sangrado' },
  { a: 'aspirina', b: 'ibuprofeno', descripcion: 'Mayor riesgo gastrointestinal' },
  { a: 'enalapril', b: 'espironolactona', descripcion: 'Riesgo de hiperpotasemia' },
  { a: 'simvastatina', b: 'claritromicina', descripcion: 'Riesgo de rabdomiólisis' },
  { a: 'metformina', b: 'contraste', descripcion: 'Riesgo de acidosis láctica' },
  { a: 'tramadol', b: 'fluoxetina', descripcion: 'Riesgo de síndrome serotoninérgico' },
];

const norm = (s: string): string => s.toLowerCase().trim();

/** ¿El texto del medicamento contiene la palabra clave del fármaco/alergia? */
const contiene = (medicamento: string, clave: string): boolean =>
  norm(medicamento).includes(norm(clave));

export function checkPrescription(
  medicamentos: MedicamentoLite[],
  alergias: string[],
): SafetyResult {
  const nombres = medicamentos.map((m) => m.nombre);

  // 1) Conflictos con alergias del paciente
  const alergiasConflicto: AlergiaConflicto[] = [];
  for (const med of nombres) {
    for (const alergia of alergias) {
      if (alergia && contiene(med, alergia)) {
        alergiasConflicto.push({ medicamento: med, alergia });
      }
    }
  }

  // 2) Interacciones entre los medicamentos recetados
  const interacciones: Interaccion[] = [];
  for (let i = 0; i < nombres.length; i++) {
    for (let j = i + 1; j < nombres.length; j++) {
      for (const it of INTERACCIONES) {
        const par1 = contiene(nombres[i], it.a) && contiene(nombres[j], it.b);
        const par2 = contiene(nombres[i], it.b) && contiene(nombres[j], it.a);
        if (par1 || par2) {
          interacciones.push({ entre: [nombres[i], nombres[j]], descripcion: it.descripcion });
        }
      }
    }
  }

  return { alergias: alergiasConflicto, interacciones };
}

/** ¿Hay algún conflicto que justifique bloquear/alertar? */
export const tieneConflictos = (r: SafetyResult): boolean =>
  r.alergias.length > 0 || r.interacciones.length > 0;
