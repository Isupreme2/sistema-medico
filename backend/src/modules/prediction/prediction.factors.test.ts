import { describe, it, expect } from 'vitest';
import { evaluateFactors } from './prediction.factors';
import type { RawFeatures } from './prediction.featureBuilder';

function raw(overrides: Partial<RawFeatures> = {}): RawFeatures {
  return {
    total_consultas: 2,
    consultas_con_signos_vitales: 2,
    dias_desde_ultima_consulta: 10,
    intervalo_promedio_dias_consultas: 30,
    presion_sistolica_ultima: 120,
    presion_sistolica_promedio: 118,
    presion_sistolica_maxima: 125,
    presion_diastolica_ultima: 80,
    presion_diastolica_promedio: 78,
    frecuencia_cardiaca_ultima: 72,
    frecuencia_cardiaca_promedio: 74,
    glucosa_ultima: 95,
    glucosa_promedio: 92,
    glucosa_maxima: 100,
    imc_ultimo: 24,
    saturacion_o2_ultima: 98,
    saturacion_o2_minima: 97,
    temperatura_maxima: 36.5,
    conteo_keywords_cardiovascular: 0,
    conteo_keywords_metabolico: 0,
    conteo_keywords_respiratorio: 0,
    ...overrides,
  };
}

describe('evaluateFactors — cardiovascular', () => {
  it('detecta presion sistolica elevada en el historial (> 140)', () => {
    const factors = evaluateFactors('cardiovascular', raw({ presion_sistolica_maxima: 145 }));
    expect(factors).toContain('Presion sistolica elevada en el historial');
  });

  it('detecta presion sistolica elevada en ultima consulta (> 130)', () => {
    const factors = evaluateFactors('cardiovascular', raw({ presion_sistolica_ultima: 135 }));
    expect(factors).toContain('Presion sistolica elevada en la ultima consulta');
  });

  it('detecta presion diastolica elevada (> 90)', () => {
    const factors = evaluateFactors('cardiovascular', raw({ presion_diastolica_ultima: 95 }));
    expect(factors).toContain('Presion diastolica elevada');
  });

  it('no activa factores con valores normales', () => {
    const factors = evaluateFactors('cardiovascular', raw());
    expect(factors).toHaveLength(0);
  });
});

describe('evaluateFactors — metabolico', () => {
  it('detecta glucosa maxima elevada (> 126)', () => {
    const factors = evaluateFactors('metabolico', raw({ glucosa_maxima: 130 }));
    expect(factors).toContain('Niveles elevados de glucosa en el historial');
  });

  it('detecta glucosa promedio elevada (> 100)', () => {
    const factors = evaluateFactors('metabolico', raw({ glucosa_promedio: 105 }));
    expect(factors).toContain('Glucosa promedio elevada');
  });

  it('detecta IMC elevado (> 30)', () => {
    const factors = evaluateFactors('metabolico', raw({ imc_ultimo: 32 }));
    expect(factors).toContain('Indice de masa corporal elevado (sobrepeso/obesidad)');
  });

  it('detecta keywords metabolicos', () => {
    const factors = evaluateFactors('metabolico', raw({ conteo_keywords_metabolico: 2 }));
    expect(factors).toContain('Terminos de riesgo metabolico en el historial');
  });

  it('no activa factores con valores normales', () => {
    const factors = evaluateFactors('metabolico', raw());
    expect(factors).toHaveLength(0);
  });
});

describe('evaluateFactors — respiratorio', () => {
  it('detecta saturacion O2 baja recurrente (< 92)', () => {
    const factors = evaluateFactors('respiratorio', raw({ saturacion_o2_minima: 88 }));
    expect(factors).toContain('Saturacion de oxigeno baja recurrente');
  });

  it('detecta saturacion O2 baja en ultima consulta (< 94)', () => {
    const factors = evaluateFactors('respiratorio', raw({ saturacion_o2_ultima: 90 }));
    expect(factors).toContain('Saturacion de oxigeno baja en la ultima consulta');
  });

  it('detecta fiebre alta (> 38 C)', () => {
    const factors = evaluateFactors('respiratorio', raw({ temperatura_maxima: 38.5 }));
    expect(factors).toContain('Fiebre alta registrada en el historial');
  });

  it('no activa factores con valores normales', () => {
    const factors = evaluateFactors('respiratorio', raw());
    expect(factors).toHaveLength(0);
  });
});

describe('evaluateFactors — pureza (determinista)', () => {
  it('misma entrada siempre produce los mismos factores', () => {
    const r = raw({ presion_sistolica_maxima: 150, glucosa_maxima: 130 });
    const f1 = evaluateFactors('cardiovascular', r);
    const f2 = evaluateFactors('cardiovascular', r);
    expect(f1).toEqual(f2);
  });
});
