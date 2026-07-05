import path from "node:path";
import fs from "node:fs";
import metadata from "./model-metadata.json";

export type RiskCategory = "cardiovascular" | "metabolico" | "respiratorio";
export type RiskLevel = "bajo" | "medio" | "alto";

export interface PreprocessingParams {
  medians: Record<string, number | null>;
  scaler_mean: number[];
  scaler_scale: number[];
}

export interface ModelEntry {
  onnx_file: string;
  output_prob_name: string;
}

export interface ModelMetadata {
  schema_version: string;
  model_version: string;
  generated_at: string;
  random_state: number;
  feature_order: string[];
  preprocessing: PreprocessingParams;
  risk_categories: RiskCategory[];
  thresholds: Record<RiskLevel, { minInclusive: number; maxInclusive?: number; maxExclusive?: number }>;
  models: Record<RiskCategory, ModelEntry>;
  output_spec: {
    probability_col: number;
    interpretation: string;
    disclaimer: string;
  };
}

const MODEL_DIR = __dirname;

function getModelPath(category: RiskCategory): string {
  const entry = (metadata as ModelMetadata).models[category];
  return path.join(MODEL_DIR, entry.onnx_file);
}

function getMetadata(): ModelMetadata {
  return metadata as ModelMetadata;
}

function validateAssets(): string[] {
  const missing: string[] = [];
  for (const cat of (metadata as ModelMetadata).risk_categories) {
    const p = getModelPath(cat);
    if (!fs.existsSync(p)) missing.push(p);
  }
  return missing;
}

export interface GoldenCaseEntry {
  case_id: string;
  descripcion: string;
  raw_features: number[];
  scaled_features: number[];
  probabilidades: Record<RiskCategory, number>;
}

export interface GoldenCasesFile {
  schema_version: string;
  feature_order: string[];
  cases: GoldenCaseEntry[];
}

export { getModelPath, getMetadata, validateAssets, MODEL_DIR };
