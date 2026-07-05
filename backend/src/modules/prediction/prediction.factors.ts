import { RiskCategory } from "./model";
import { RawFeatures } from "./prediction.featureBuilder";

interface FactorRule {
  key: keyof RawFeatures;
  threshold: number;
  compare: "gt" | "lt" | "ge" | "le";
  msg: string;
}

const FACTOR_RULES: Record<RiskCategory, FactorRule[]> = {
  cardiovascular: [
    {
      key: "presion_sistolica_maxima",
      threshold: 140,
      compare: "gt",
      msg: "Presion sistolica elevada en el historial",
    },
    {
      key: "presion_sistolica_ultima",
      threshold: 130,
      compare: "gt",
      msg: "Presion sistolica elevada en la ultima consulta",
    },
    {
      key: "presion_diastolica_ultima",
      threshold: 90,
      compare: "gt",
      msg: "Presion diastolica elevada",
    },
    {
      key: "frecuencia_cardiaca_promedio",
      threshold: 100,
      compare: "gt",
      msg: "Frecuencia cardiaca elevada recurrente",
    },
    {
      key: "conteo_keywords_cardiovascular",
      threshold: 1,
      compare: "ge",
      msg: "Terminos de riesgo cardiovascular en el historial",
    },
  ],
  metabolico: [
    {
      key: "glucosa_maxima",
      threshold: 126,
      compare: "gt",
      msg: "Niveles elevados de glucosa en el historial",
    },
    {
      key: "glucosa_ultima",
      threshold: 110,
      compare: "gt",
      msg: "Glucosa elevada en la ultima consulta",
    },
    {
      key: "glucosa_promedio",
      threshold: 100,
      compare: "gt",
      msg: "Glucosa promedio elevada",
    },
    {
      key: "imc_ultimo",
      threshold: 30,
      compare: "gt",
      msg: "Indice de masa corporal elevado (sobrepeso/obesidad)",
    },
    {
      key: "conteo_keywords_metabolico",
      threshold: 1,
      compare: "ge",
      msg: "Terminos de riesgo metabolico en el historial",
    },
  ],
  respiratorio: [
    {
      key: "saturacion_o2_minima",
      threshold: 92,
      compare: "lt",
      msg: "Saturacion de oxigeno baja recurrente",
    },
    {
      key: "saturacion_o2_ultima",
      threshold: 94,
      compare: "lt",
      msg: "Saturacion de oxigeno baja en la ultima consulta",
    },
    {
      key: "temperatura_maxima",
      threshold: 38,
      compare: "gt",
      msg: "Fiebre alta registrada en el historial",
    },
    {
      key: "conteo_keywords_respiratorio",
      threshold: 1,
      compare: "ge",
      msg: "Terminos de riesgo respiratorio en el historial",
    },
  ],
};

function evaluateRule(rule: FactorRule, raw: RawFeatures): boolean {
  const val = raw[rule.key] as number | null;
  if (val === null || val === undefined) return false;

  switch (rule.compare) {
    case "gt":
      return val > rule.threshold;
    case "lt":
      return val < rule.threshold;
    case "ge":
      return val >= rule.threshold;
    case "le":
      return val <= rule.threshold;
  }
}

export function evaluateFactors(
  category: RiskCategory,
  raw: RawFeatures,
): string[] {
  const rules = FACTOR_RULES[category];
  const active: string[] = [];

  for (const rule of rules) {
    if (evaluateRule(rule, raw)) {
      active.push(rule.msg);
    }
  }

  return active;
}
