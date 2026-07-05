import { ModelMetadata } from "./model";
import { IMedicalRecord } from "../../models/medicalRecord.model";

const CONTROLLED_KEYWORDS: Record<string, string[]> = {
  cardiovascular: [
    "hipertension",
    "presion alta",
    "dolor toracico",
    "taquicardia",
    "palpitaciones",
  ],
  metabolico: [
    "diabetes",
    "glucosa",
    "hiperglucemia",
    "obesidad",
    "sobrepeso",
  ],
  respiratorio: [
    "asma",
    "tos",
    "disnea",
    "bronquitis",
    "dificultad respiratoria",
  ],
};

export interface RawFeatures {
  total_consultas: number;
  consultas_con_signos_vitales: number;
  dias_desde_ultima_consulta: number;
  intervalo_promedio_dias_consultas: number;
  presion_sistolica_ultima: number | null;
  presion_sistolica_promedio: number;
  presion_sistolica_maxima: number;
  presion_diastolica_ultima: number | null;
  presion_diastolica_promedio: number;
  frecuencia_cardiaca_ultima: number | null;
  frecuencia_cardiaca_promedio: number;
  glucosa_ultima: number | null;
  glucosa_promedio: number;
  glucosa_maxima: number;
  imc_ultimo: number | null;
  saturacion_o2_ultima: number | null;
  saturacion_o2_minima: number;
  temperatura_maxima: number;
  conteo_keywords_cardiovascular: number;
  conteo_keywords_metabolico: number;
  conteo_keywords_respiratorio: number;
}

export interface FeatureResult {
  raw: RawFeatures;
  tensor: Float32Array;
}

function hasSignosVitales(r: IMedicalRecord): boolean {
  const sv = r.signosVitales;
  if (!sv) return false;
  return (
    sv.presionSistolica !== undefined ||
    sv.presionDiastolica !== undefined ||
    sv.frecuenciaCardiaca !== undefined ||
    sv.glucosa !== undefined ||
    sv.temperatura !== undefined ||
    sv.saturacionO2 !== undefined ||
    sv.peso !== undefined ||
    sv.talla !== undefined
  );
}

function computeIMC(pesoKg: number, tallaCm: number): number {
  if (tallaCm <= 0) return 0;
  return pesoKg / ((tallaCm / 100) * (tallaCm / 100));
}

function countKeywords(
  records: IMedicalRecord[],
  keywords: string[],
): number {
  let count = 0;
  for (const r of records) {
    const text = [
      r.motivo || "",
      r.diagnostico || "",
      r.notas || "",
      r.cie10 || "",
    ].join(" ").toLowerCase();
    for (const kw of keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      const matches = text.match(regex);
      if (matches) count += matches.length;
    }
  }
  return count;
}

export function buildFeatures(
  records: IMedicalRecord[],
  metadata: ModelMetadata,
): FeatureResult | null {
  const total = records.length;
  if (total < 2) return null;

  const conSignos = records.filter(hasSignosVitales).length;
  if (conSignos < 1) return null;

  records.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
  const ultimo = records[0];

  const diasDesdeUltima = Math.round(
    (Date.now() - new Date(ultimo.fecha).getTime()) / (1000 * 60 * 60 * 24),
  );

  let sumaIntervalos = 0;
  let countIntervalos = 0;
  for (let i = 0; i < records.length - 1; i++) {
    const actual = new Date(records[i].fecha).getTime();
    const anterior = new Date(records[i + 1].fecha).getTime();
    const diff = Math.round((actual - anterior) / (1000 * 60 * 60 * 24));
    if (diff > 0) {
      sumaIntervalos += diff;
      countIntervalos++;
    }
  }
  const intervaloPromedio =
    countIntervalos > 0
      ? Math.round(sumaIntervalos / countIntervalos)
      : diasDesdeUltima;

  const sistolicas = records
    .map((r) => r.signosVitales?.presionSistolica)
    .filter((v): v is number => v !== undefined && v !== null);
  const diastolicas = records
    .map((r) => r.signosVitales?.presionDiastolica)
    .filter((v): v is number => v !== undefined && v !== null);
  const frecuencias = records
    .map((r) => r.signosVitales?.frecuenciaCardiaca)
    .filter((v): v is number => v !== undefined && v !== null);
  const glucosas = records
    .map((r) => r.signosVitales?.glucosa)
    .filter((v): v is number => v !== undefined && v !== null);
  const satO2s = records
    .map((r) => r.signosVitales?.saturacionO2)
    .filter((v): v is number => v !== undefined && v !== null);
  const temperaturas = records
    .map((r) => r.signosVitales?.temperatura)
    .filter((v): v is number => v !== undefined && v !== null);

  const imcValues: number[] = [];
  for (const r of records) {
    if (r.signosVitales?.peso !== undefined && r.signosVitales?.talla !== undefined) {
      imcValues.push(computeIMC(r.signosVitales.peso, r.signosVitales.talla));
    }
  }

  const svUltimo = ultimo.signosVitales || {};

  const raw: RawFeatures = {
    total_consultas: total,
    consultas_con_signos_vitales: conSignos,
    dias_desde_ultima_consulta: diasDesdeUltima,
    intervalo_promedio_dias_consultas: intervaloPromedio,
    presion_sistolica_ultima: svUltimo.presionSistolica ?? null,
    presion_sistolica_promedio:
      sistolicas.length > 0
        ? sistolicas.reduce((a, b) => a + b, 0) / sistolicas.length
        : 0,
    presion_sistolica_maxima:
      sistolicas.length > 0 ? Math.max(...sistolicas) : 0,
    presion_diastolica_ultima: svUltimo.presionDiastolica ?? null,
    presion_diastolica_promedio:
      diastolicas.length > 0
        ? diastolicas.reduce((a, b) => a + b, 0) / diastolicas.length
        : 0,
    frecuencia_cardiaca_ultima: svUltimo.frecuenciaCardiaca ?? null,
    frecuencia_cardiaca_promedio:
      frecuencias.length > 0
        ? frecuencias.reduce((a, b) => a + b, 0) / frecuencias.length
        : 0,
    glucosa_ultima: svUltimo.glucosa ?? null,
    glucosa_promedio:
      glucosas.length > 0
        ? glucosas.reduce((a, b) => a + b, 0) / glucosas.length
        : 0,
    glucosa_maxima: glucosas.length > 0 ? Math.max(...glucosas) : 0,
    imc_ultimo: imcValues.length > 0 ? imcValues[imcValues.length - 1] : null,
    saturacion_o2_ultima: svUltimo.saturacionO2 ?? null,
    saturacion_o2_minima: satO2s.length > 0 ? Math.min(...satO2s) : 0,
    temperatura_maxima:
      temperaturas.length > 0 ? Math.max(...temperaturas) : 0,
    conteo_keywords_cardiovascular: countKeywords(
      records,
      CONTROLLED_KEYWORDS.cardiovascular,
    ),
    conteo_keywords_metabolico: countKeywords(
      records,
      CONTROLLED_KEYWORDS.metabolico,
    ),
    conteo_keywords_respiratorio: countKeywords(
      records,
      CONTROLLED_KEYWORDS.respiratorio,
    ),
  };

  const order = metadata.feature_order;
  const medians = metadata.preprocessing.medians;
  const scalerMean = metadata.preprocessing.scaler_mean;
  const scalerScale = metadata.preprocessing.scaler_scale;

  const values = new Float32Array(order.length);
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    let val = (raw as unknown as Record<string, number | null>)[key];

    if (val === null || val === undefined || !Number.isFinite(val)) {
      const median = medians[key];
      val = median !== null && median !== undefined ? median : 0;
    }

    values[i] = (val - scalerMean[i]) / scalerScale[i];
  }

  return { raw, tensor: values };
}
