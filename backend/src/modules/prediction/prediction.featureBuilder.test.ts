import { describe, it, expect } from 'vitest';
import { buildFeatures } from './prediction.featureBuilder';
import metadata from './model/model-metadata.json';

type TestSignos = {
  peso?: number;
  talla?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  frecuenciaCardiaca?: number;
  temperatura?: number;
  glucosa?: number;
  saturacionO2?: number;
};

type TestRecord = {
  _id: string;
  fecha: Date;
  motivo?: string;
  diagnostico: string;
  cie10?: string;
  notas?: string;
  signosVitales?: TestSignos;
};

function record(r: Partial<TestRecord>): TestRecord {
  return {
    _id: 'id',
    fecha: new Date(),
    diagnostico: 'test',
    ...r,
  };
}

const meta = metadata as import('./model').ModelMetadata;

describe('buildFeatures — casos base', () => {
  it('genera exactamente 21 features', () => {
    const records: TestRecord[] = [
      record({
        fecha: new Date('2026-06-01'),
        diagnostico: 'Hipertensión',
        signosVitales: { presionSistolica: 150, presionDiastolica: 90, peso: 80, talla: 175 },
      }),
      record({
        fecha: new Date('2026-06-15'),
        diagnostico: 'Control',
        signosVitales: { presionSistolica: 140, presionDiastolica: 85, peso: 79, talla: 175 },
      }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).not.toBeNull();
    expect(result!.tensor.length).toBe(21);
  });

  it('respeta el orden feature_order de la metadata', () => {
    const records: TestRecord[] = [
      record({
        fecha: new Date('2026-06-01'),
        diagnostico: 'Hipertensión',
        signosVitales: { presionSistolica: 150, presionDiastolica: 90, peso: 80, talla: 175 },
      }),
      record({
        fecha: new Date('2026-06-15'),
        diagnostico: 'Control',
        signosVitales: { presionSistolica: 140, presionDiastolica: 85, peso: 79, talla: 175 },
      }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).not.toBeNull();
    const keys = Object.keys(result!.raw);
    expect(keys).toEqual(meta.feature_order);
  });

  it('calcula total_consultas correctamente', () => {
    const records: TestRecord[] = [
      record({ fecha: new Date('2026-01-01'), diagnostico: 'A', signosVitales: { peso: 70, talla: 170 } }),
      record({ fecha: new Date('2026-02-01'), diagnostico: 'B', signosVitales: { peso: 71, talla: 170 } }),
      record({ fecha: new Date('2026-03-01'), diagnostico: 'C', signosVitales: { peso: 72, talla: 170 } }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).not.toBeNull();
    expect(result!.raw.total_consultas).toBe(3);
    expect(result!.raw.consultas_con_signos_vitales).toBe(3);
  });

  it('calcula IMC correctamente (peso 80, talla 175 → 26.12)', () => {
    const records: TestRecord[] = [
      record({ fecha: new Date('2026-01-01'), diagnostico: 'A', signosVitales: { peso: 80, talla: 175 } }),
      record({ fecha: new Date('2026-02-01'), diagnostico: 'B', signosVitales: { peso: 79, talla: 175 } }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).not.toBeNull();
    const imcEsperado = 80 / ((175 / 100) * (175 / 100));
    expect(result!.raw.imc_ultimo).toBeCloseTo(imcEsperado, 1);
  });

  it('cuenta keywords correctamente', () => {
    const records: TestRecord[] = [
      record({
        fecha: new Date('2026-01-01'),
        diagnostico: 'Hipertensión arterial',
        notas: 'paciente con presion alta y taquicardia',
        signosVitales: { peso: 70, talla: 170 },
      }),
      record({
        fecha: new Date('2026-02-01'),
        diagnostico: 'Diabetes tipo 2',
        notas: 'glucosa elevada, sobrepeso',
        signosVitales: { peso: 71, talla: 170 },
      }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).not.toBeNull();
    expect(result!.raw.conteo_keywords_cardiovascular).toBeGreaterThan(0);
    expect(result!.raw.conteo_keywords_metabolico).toBeGreaterThan(0);
  });

  it('es determinista: misma entrada → misma salida', () => {
    const records: TestRecord[] = [
      record({
        fecha: new Date('2026-06-01'),
        diagnostico: 'Hipertensión',
        signosVitales: { presionSistolica: 150, presionDiastolica: 90, peso: 80, talla: 175, glucosa: 110 },
      }),
      record({
        fecha: new Date('2026-06-15'),
        diagnostico: 'Control',
        signosVitales: { presionSistolica: 140, presionDiastolica: 85, peso: 79, talla: 175, glucosa: 105 },
      }),
    ];
    const r1 = buildFeatures(records as never, meta);
    const r2 = buildFeatures(records as never, meta);
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    for (let i = 0; i < 21; i++) {
      expect(r1!.tensor[i]).toBe(r2!.tensor[i]);
    }
  });
});

describe('buildFeatures — casos borde', () => {
  it('retorna null si no hay registros', () => {
    const result = buildFeatures([], meta);
    expect(result).toBeNull();
  });

  it('retorna null si hay menos de 2 registros', () => {
    const records: TestRecord[] = [
      record({ fecha: new Date(), diagnostico: 'Única', signosVitales: { peso: 70, talla: 170 } }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).toBeNull();
  });

  it('retorna null si hay < 1 registro con signos vitales', () => {
    const records: TestRecord[] = [
      record({ fecha: new Date('2026-01-01'), diagnostico: 'A' }),
      record({ fecha: new Date('2026-02-01'), diagnostico: 'B' }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).toBeNull();
  });

  it('tolera valores nulos (imputa con mediana)', () => {
    const records: TestRecord[] = [
      record({
        fecha: new Date('2026-01-01'),
        diagnostico: 'A',
        signosVitales: { peso: 80, talla: 175 },
      }),
      record({
        fecha: new Date('2026-02-01'),
        diagnostico: 'B',
        signosVitales: { peso: 81, talla: 175 },
      }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).not.toBeNull();
    expect(result!.raw.glucosa_ultima).toBeNull();
    expect(Number.isFinite(result!.tensor[12])).toBe(true);
  });

  it('no falla con signos vitales parciales', () => {
    const records: TestRecord[] = [
      record({
        fecha: new Date('2026-01-01'),
        diagnostico: 'A',
        signosVitales: { peso: 80, talla: 175, presionSistolica: 120 },
      }),
      record({
        fecha: new Date('2026-02-01'),
        diagnostico: 'B',
        signosVitales: { peso: 81, talla: 175, glucosa: 100 },
      }),
    ];
    const result = buildFeatures(records as never, meta);
    expect(result).not.toBeNull();
    expect(result!.raw.presion_sistolica_promedio).toBe(120);
    expect(result!.raw.glucosa_promedio).toBe(100);
  });
});
