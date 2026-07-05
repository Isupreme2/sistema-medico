#!/usr/bin/env python3
"""
Fase 6 — Generacion de casos de referencia (golden cases) para la verificación
de consistencia Python <-> Node.

Genera 3 casos de prueba:
  - normal: paciente sano (signos normales)
  - alto_riesgo: paciente con multiples factores de riesgo
  - mixto: paciente con riesgo cardiovascular alto, metabolico medio, respiratorio bajo

Para cada caso:
  1. Define un vector de 21 features (sin preprocesar)
  2. Aplica imputacion + escalado (igual que en Node)
  3. Ejecuta inferencia con los 3 modelos ONNX
  4. Guarda features (raw + scaled) y probabilidades

Uso:
    cd ml/risk-prediction
    python src/generate_golden_cases.py

Salida:
    artifacts/golden_cases.json  ->  backend/src/modules/prediction/model/golden_cases.json
"""

import json
import os
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
BACKEND_MODEL_DIR = (
    BASE_DIR.parent.parent / "backend" / "src" / "modules" / "prediction" / "model"
)

RISK_CATEGORIES = ["cardiovascular", "metabolico", "respiratorio"]
FEATURE_ORDER = [
    "total_consultas",
    "consultas_con_signos_vitales",
    "dias_desde_ultima_consulta",
    "intervalo_promedio_dias_consultas",
    "presion_sistolica_ultima",
    "presion_sistolica_promedio",
    "presion_sistolica_maxima",
    "presion_diastolica_ultima",
    "presion_diastolica_promedio",
    "frecuencia_cardiaca_ultima",
    "frecuencia_cardiaca_promedio",
    "glucosa_ultima",
    "glucosa_promedio",
    "glucosa_maxima",
    "imc_ultimo",
    "saturacion_o2_ultima",
    "saturacion_o2_minima",
    "temperatura_maxima",
    "conteo_keywords_cardiovascular",
    "conteo_keywords_metabolico",
    "conteo_keywords_respiratorio",
]


def load_metadata():
    path = BACKEND_MODEL_DIR / "model-metadata.json"
    with open(path) as f:
        return json.load(f)


def load_onnx_session(category: str):
    path = BACKEND_MODEL_DIR / f"xgb_{category}.onnx"
    return ort.InferenceSession(str(path))


def preprocess(raw: list[float], metadata: dict) -> np.ndarray:
    """Aplica imputacion con mediana + StandardScaler (igual que en Node)."""
    x = np.array(raw, dtype=np.float32)
    medians = metadata["preprocessing"]["medians"]
    scaler_mean = np.array(metadata["preprocessing"]["scaler_mean"], dtype=np.float32)
    scaler_scale = np.array(metadata["preprocessing"]["scaler_scale"], dtype=np.float32)

    for i, key in enumerate(FEATURE_ORDER):
        if not np.isfinite(x[i]):
            med = medians.get(key)
            x[i] = med if med is not None else 0.0

    x = (x - scaler_mean) / scaler_scale
    return x


def infer(session, tensor: np.ndarray) -> float:
    inputs = {session.get_inputs()[0].name: tensor.astype(np.float32).reshape(1, -1)}
    outputs = session.run(None, inputs)
    output_map = {session.get_outputs()[i].name: outputs[i] for i in range(len(outputs))}
    probs = output_map["probabilities"]
    return float(probs[0, 1])


def main():
    metadata = load_metadata()

    CASES = {
        "normal": {
            "descripcion": "Paciente sano sin factores de riesgo",
            "raw_features": [
                4,    # total_consultas
                4,    # consultas_con_signos_vitales
                7,    # dias_desde_ultima_consulta
                30,   # intervalo_promedio_dias_consultas
                120,  # presion_sistolica_ultima
                118,  # presion_sistolica_promedio
                125,  # presion_sistolica_maxima
                80,   # presion_diastolica_ultima
                78,   # presion_diastolica_promedio
                72,   # frecuencia_cardiaca_ultima
                74,   # frecuencia_cardiaca_promedio
                95,   # glucosa_ultima
                92,   # glucosa_promedio
                100,  # glucosa_maxima
                24,   # imc_ultimo
                98,   # saturacion_o2_ultima
                97,   # saturacion_o2_minima
                36.5, # temperatura_maxima
                0,    # conteo_keywords_cardiovascular
                0,    # conteo_keywords_metabolico
                0,    # conteo_keywords_respiratorio
            ],
        },
        "alto_riesgo": {
            "descripcion": "Paciente con hipertension, diabetes y EPOC",
            "raw_features": [
                8,    # total_consultas
                8,    # consultas_con_signos_vitales
                3,    # dias_desde_ultima_consulta
                15,   # intervalo_promedio_dias_consultas
                175,  # presion_sistolica_ultima
                165,  # presion_sistolica_promedio
                185,  # presion_sistolica_maxima
                105,  # presion_diastolica_ultima
                100,  # presion_diastolica_promedio
                95,   # frecuencia_cardiaca_ultima
                92,   # frecuencia_cardiaca_promedio
                200,  # glucosa_ultima
                185,  # glucosa_promedio
                220,  # glucosa_maxima
                33,   # imc_ultimo
                88,   # saturacion_o2_ultima
                84,   # saturacion_o2_minima
                37.2, # temperatura_maxima
                3,    # conteo_keywords_cardiovascular
                4,    # conteo_keywords_metabolico
                2,    # conteo_keywords_respiratorio
            ],
        },
        "mixto": {
            "descripcion": "Riesgo cardiovascular alto, metabolico medio, respiratorio bajo",
            "raw_features": [
                5,    # total_consultas
                5,    # consultas_con_signos_vitales
                15,   # dias_desde_ultima_consulta
                60,   # intervalo_promedio_dias_consultas
                155,  # presion_sistolica_ultima
                148,  # presion_sistolica_promedio
                160,  # presion_sistolica_maxima
                92,   # presion_diastolica_ultima
                88,   # presion_diastolica_promedio
                78,   # frecuencia_cardiaca_ultima
                76,   # frecuencia_cardiaca_promedio
                115,  # glucosa_ultima
                110,  # glucosa_promedio
                130,  # glucosa_maxima
                28,   # imc_ultimo
                97,   # saturacion_o2_ultima
                96,   # saturacion_o2_minima
                36.8, # temperatura_maxima
                2,    # conteo_keywords_cardiovascular
                1,    # conteo_keywords_metabolico
                0,    # conteo_keywords_respiratorio
            ],
        },
    }

    print("Generando golden cases...")
    print(f"Usando modelos ONNX de: {BACKEND_MODEL_DIR}\n")

    sessions = {}
    for cat in RISK_CATEGORIES:
        sessions[cat] = load_onnx_session(cat)

    output = {"schema_version": "1.0.0", "feature_order": FEATURE_ORDER, "cases": []}

    for case_id, case_data in CASES.items():
        print(f"  [{case_id}] {case_data['descripcion']}")

        raw_features = np.array(case_data["raw_features"], dtype=np.float32)
        scaled_tensor = preprocess(case_data["raw_features"], metadata)

        probs = {}
        for cat in RISK_CATEGORIES:
            prob = infer(sessions[cat], scaled_tensor)
            probs[cat] = round(prob, 6)

        print(f"    Probabilidades: {probs}")

        entry = {
            "case_id": case_id,
            "descripcion": case_data["descripcion"],
            "raw_features": [float(x) for x in raw_features],
            "scaled_features": [float(x) for x in scaled_tensor],
            "probabilidades": probs,
        }
        output["cases"].append(entry)

    # Guardar en artifacts/
    artifacts_path = ARTIFACTS_DIR / "golden_cases.json"
    with open(artifacts_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Golden cases guardados en {artifacts_path}")

    # Copiar al backend
    BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    backend_path = BACKEND_MODEL_DIR / "golden_cases.json"
    with open(backend_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"[OK] Golden cases copiados a {backend_path}")

    print("\nDone.")


if __name__ == "__main__":
    main()
