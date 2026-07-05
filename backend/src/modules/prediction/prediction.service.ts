import { User } from "../../models/user.model";
import { MedicalRecord } from "../../models/medicalRecord.model";
import { UserRole } from "../../constants/roles";
import { AppError } from "../../utils/AppError";
import { AccessTokenPayload } from "../../utils/jwt";
import { predictionEngine } from "./prediction.engine";
import { buildFeatures } from "./prediction.featureBuilder";
import { evaluateFactors } from "./prediction.factors";
import { RiskCategory, RiskLevel } from "./model";

export interface CategoriaPrediccion {
  categoria: RiskCategory;
  probabilidad: number;
  nivel: RiskLevel;
  factores: string[];
}

export type PredictionStatus =
  | "ok"
  | "datos_insuficientes"
  | "error_inferencia";

export interface PredictionResponse {
  pacienteId: string;
  generadoEn: string;
  horizonte: "proxima_visita";
  estado: PredictionStatus;
  categorias: CategoriaPrediccion[];
  disclaimer: string;
}

function determinarNivel(
  prob: number,
  thresholds: Record<
    RiskLevel,
    { minInclusive: number; maxInclusive?: number; maxExclusive?: number }
  >,
): RiskLevel {
  if (prob >= thresholds.alto.minInclusive) return "alto";
  if (prob >= thresholds.medio.minInclusive) return "medio";
  return "bajo";
}

export async function getPrediction(
  pacienteId: string,
  _requester: AccessTokenPayload,
): Promise<PredictionResponse> {
  const paciente = await User.findById(pacienteId);
  if (!paciente || paciente.rol !== UserRole.PACIENTE) {
    throw AppError.notFound("Paciente no encontrado");
  }

  const records = await MedicalRecord.find({ pacienteId }).sort({ fecha: -1 });

  const metadata = predictionEngine.getMetadata();

  const featureResult = buildFeatures(records, metadata);

  if (!featureResult) {
    return {
      pacienteId,
      generadoEn: new Date().toISOString(),
      horizonte: "proxima_visita",
      estado: "datos_insuficientes",
      categorias: [],
      disclaimer: metadata.output_spec.disclaimer,
    };
  }

  const categorias: CategoriaPrediccion[] = [];

  for (const cat of metadata.risk_categories) {
    const prob = await predictionEngine.predict(cat, featureResult.tensor);

    if (prob === null) {
      categorias.push({
        categoria: cat,
        probabilidad: 0,
        nivel: "bajo",
        factores: [],
      });
      continue;
    }

    const nivel = determinarNivel(prob, metadata.thresholds);
    const factores = evaluateFactors(cat, featureResult.raw);

    categorias.push({
      categoria: cat,
      probabilidad: Math.round(prob * 10000) / 10000,
      nivel,
      factores,
    });
  }

  const tieneError = categorias.every((c) => c.probabilidad === 0);

  return {
    pacienteId,
    generadoEn: new Date().toISOString(),
    horizonte: "proxima_visita",
    estado: tieneError ? "error_inferencia" : "ok",
    categorias,
    disclaimer: metadata.output_spec.disclaimer,
  };
}
