import * as ort from "onnxruntime-node";
import {
  getModelPath,
  getMetadata,
  validateAssets,
  RiskCategory,
  ModelMetadata,
} from "./model";

export type { RiskCategory, ModelMetadata };

export class PredictionEngine {
  private sessions: Map<RiskCategory, ort.InferenceSession> = new Map();
  private metadata!: ModelMetadata;
  private initialized = false;

  async initialize(): Promise<void> {
    this.metadata = getMetadata();

    const missing = validateAssets();
    if (missing.length > 0) {
      throw new Error(
        `Archivos ONNX no encontrados:\n${missing.join("\n")}`,
      );
    }

    for (const cat of this.metadata.risk_categories) {
      const modelPath = getModelPath(cat);
      const session = await ort.InferenceSession.create(modelPath);

      if (!session.inputNames.includes("float_input")) {
        throw new Error(
          `Modelo ${cat}: falta input "float_input". Disponibles: ${session.inputNames.join(", ")}`,
        );
      }

      if (!session.outputNames.includes("probabilities")) {
        throw new Error(
          `Modelo ${cat}: falta output "probabilities". Disponibles: ${session.outputNames.join(", ")}`,
        );
      }

      this.sessions.set(cat, session);
    }

    this.initialized = true;
  }

  async predict(
    category: RiskCategory,
    tensor: Float32Array,
  ): Promise<number | null> {
    if (!this.initialized) {
      return null;
    }

    const session = this.sessions.get(category);
    if (!session) return null;

    try {
      const feeds: Record<string, ort.Tensor> = {
        float_input: new ort.Tensor("float32", tensor, [1, tensor.length]),
      };
      const results = await session.run(feeds);
      const probOutput = results.probabilities;
      if (!probOutput) return null;

      const probData = probOutput.data as Float32Array;
      const probCol = this.metadata.output_spec.probability_col;
      return probData[probCol];
    } catch {
      return null;
    }
  }

  getMetadata(): ModelMetadata {
    return this.metadata;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const predictionEngine = new PredictionEngine();
