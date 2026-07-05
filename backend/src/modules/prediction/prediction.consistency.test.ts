import { describe, it, expect, beforeAll } from 'vitest';
import { predictionEngine } from './prediction.engine';
import metadata from './model/model-metadata.json';
import golden from './model/golden_cases.json';

const meta = metadata as import('./model').ModelMetadata;
const goldenCases = golden as import('./model').GoldenCasesFile;

const TOLERANCE = 1e-3;

function preprocessTensor(rawFeatures: number[]): Float32Array {
  const order = meta.feature_order;
  const medians = meta.preprocessing.medians as Record<string, number | null>;
  const scalerMean = meta.preprocessing.scaler_mean;
  const scalerScale = meta.preprocessing.scaler_scale;

  const values = new Float32Array(order.length);
  for (let i = 0; i < order.length; i++) {
    let val = rawFeatures[i];
    if (val === null || val === undefined || !Number.isFinite(val)) {
      const median = medians[order[i]];
      val = median !== null && median !== undefined ? median : 0;
    }
    values[i] = (val - scalerMean[i]) / scalerScale[i];
  }
  return values;
}

describe('consistencia Python <-> Node', () => {
  // Inicializar engine una vez al inicio
  beforeAll(async () => {
    if (!predictionEngine.isInitialized()) {
      await predictionEngine.initialize();
    }
  });

  for (const testCase of goldenCases.cases) {
    describe(`caso: ${testCase.case_id} (${testCase.descripcion})`, () => {
      const tensor = preprocessTensor(testCase.raw_features);

      it('features escaladas coinciden con golden (tolerancia 1e-4)', () => {
        for (let i = 0; i < meta.feature_order.length; i++) {
          expect(tensor[i]).toBeCloseTo(testCase.scaled_features[i], 4);
        }
      });

      for (const cat of (['cardiovascular', 'metabolico', 'respiratorio'] as const)) {
        it(`probabilidad ${cat} coincide con golden (tolerancia ${TOLERANCE})`, async () => {
          const prob = await predictionEngine.predict(cat, tensor);
          expect(prob).not.toBeNull();
          const expected = testCase.probabilidades[cat];
          const diff = Math.abs(prob! - expected);
          expect(diff).toBeLessThanOrEqual(TOLERANCE);
        });
      }
    });
  }
});
