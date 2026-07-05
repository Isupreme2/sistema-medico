#!/usr/bin/env python3
"""
Fase 3 — Exportación a ONNX y Generación de Metadata.

Orquesta la conversión de los 3 modelos XGBoost a ONNX,
verifica la paridad Python <-> ONNX, construye model-metadata.json
y copia los artefactos al backend.

Uso:
    python src/export_onnx.py
"""

import json
import os
import shutil
import sys
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import onnxruntime as ort

warnings.filterwarnings("ignore")

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent
SRC_DIR = BASE_DIR / "src"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
BACKEND_MODEL_DIR = (
    BASE_DIR.parent.parent / "backend" / "src" / "modules" / "prediction" / "model"
)

RISK_CATEGORIES = ["cardiovascular", "metabolico", "respiratorio"]
N_FEATURES = 21
TARGET_OPSET = 15  # onnxmltools max for XGBoost
TOLERANCE = 1e-4
RANDOM_STATE = 42

sys.path.insert(0, str(SRC_DIR))


def _load_model(category: str):
    path = ARTIFACTS_DIR / f"xgb_{category}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"Modelo no encontrado: {path}")
    return joblib.load(path)


def _load_preprocessor_params() -> dict:
    path = ARTIFACTS_DIR / "preprocessor_params.json"
    if not path.exists():
        raise FileNotFoundError(f"preprocessor_params.json no encontrado: {path}")
    with open(path) as f:
        return json.load(f)


def _load_model_metadata() -> dict:
    path = ARTIFACTS_DIR / "model_metadata.json"
    if not path.exists():
        raise FileNotFoundError(f"model_metadata.json no encontrado: {path}")
    with open(path) as f:
        return json.load(f)


def _load_feature_schema() -> dict:
    path = BASE_DIR / "feature-schema.json"
    if not path.exists():
        raise FileNotFoundError(f"feature-schema.json no encontrado: {path}")
    with open(path) as f:
        return json.load(f)


def _load_test_data() -> tuple[np.ndarray, np.ndarray]:
    """Carga el conjunto de prueba y construye features.

    Reutiliza los módulos existentes de src/ para garantizar
    que el preprocesado sea exactamente el mismo.
    """
    from load_data import load_data, RISK_CATEGORIES as RC
    from build_features import build_features
    from train import split_data, binarize_target

    X_df, y_prob, y_level, feature_names = load_data()
    X_t, pp = build_features(X_df, fit=False)

    y_bin_0 = binarize_target(y_level, RC[0])
    splits = split_data(X_t, y_bin_0)
    X_train, X_val, X_test, y_train, y_val, y_test = splits

    return X_test, y_level.iloc[y_test.index.values]


def convert_models() -> dict:
    """Convierte los 3 modelos .joblib a ONNX.

    Returns:
        dict: {categoría: onnx_model_bytes}
    """
    from onnxmltools.convert.common.data_types import FloatTensorType
    import onnxmltools

    print("=" * 60)
    print("  Conversion XGBoost -> ONNX")
    print("=" * 60)

    models = {}
    for cat in RISK_CATEGORIES:
        print(f"\n[{cat}] Cargando modelo...")
        model = _load_model(cat)

        print(f"[{cat}] Convirtiendo a ONNX (opset={TARGET_OPSET})...")
        initial_types = [("float_input", FloatTensorType([None, N_FEATURES]))]
        onnx_model = onnxmltools.convert_xgboost(
            model,
            initial_types=initial_types,
            target_opset=TARGET_OPSET,
        )

        output_path = ARTIFACTS_DIR / f"xgb_{cat}.onnx"
        with open(output_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        print(f"[{cat}] ONNX guardado: {output_path} ({output_path.stat().st_size / 1024:.1f} KB)")

        models[cat] = onnx_model.SerializeToString()

    return models


def verify_parity(models_bytes: dict[str, bytes]) -> dict:
    """Verifica que la predicción ONNX coincida con la de Python.

    Compara probabilidades de la clase "alto" (columna 1) para
    los 3 modelos con tolerancia 1e-4.

    Args:
        models_bytes: {categoría: onnx_model_bytes}

    Returns:
        dict: métricas de paridad por modelo
    """
    print("\n" + "=" * 60)
    print("  Verificacion de Paridad Python <-> ONNX")
    print("=" * 60)

    X_test, y_level_test = _load_test_data()
    results = {}

    for cat in RISK_CATEGORIES:
        print(f"\n[{cat}] Cargando modelo Python nativo...")
        py_model = _load_model(cat)

        print(f"[{cat}] Prediciendo con Python...")
        py_probs = py_model.predict_proba(X_test)[:, 1]

        print(f"[{cat}] Prediciendo con ONNX...")
        onnx_bytes = models_bytes[cat]
        sess = ort.InferenceSession(onnx_bytes)
        input_name = sess.get_inputs()[0].name
        onnx_outputs = sess.run(None, {input_name: X_test.astype(np.float32)})
        onnx_output_map = {sess.get_outputs()[i].name: onnx_outputs[i] for i in range(len(sess.get_outputs()))}
        onnx_probs = onnx_output_map["probabilities"][:, 1]

        diffs = np.abs(py_probs - onnx_probs)
        max_diff = float(diffs.max())
        mean_diff = float(diffs.mean())
        n_outside = int((diffs > TOLERANCE).sum())
        passed = max_diff <= TOLERANCE

        results[cat] = {
            "max_diff": max_diff,
            "mean_diff": mean_diff,
            "n_outside_tolerance": n_outside,
            "total_cases": len(diffs),
            "tolerance": TOLERANCE,
            "passed": passed,
        }

        status = "[PASA]" if passed else "[FALLA]"
        print(f"[{cat}] {status}")
        print(f"       Diferencia maxima: {max_diff:.6e}")
        print(f"       Diferencia media:  {mean_diff:.6e}")
        print(f"       Fuera de tolerancia: {n_outside}/{len(diffs)}")

    all_passed = all(r["passed"] for r in results.values())
    print(f"\n{'=' * 60}")
    if all_passed:
        print(f"  VERIFICACION COMPLETA: TODOS LOS MODELOS PASAN [OK]")
    else:
        print(f"  VERIFICACION COMPLETA: ALGUNOS MODELOS FALLAN [FAIL]")
    print(f"{'=' * 60}")

    return results


def build_metadata() -> dict:
    """Ensambla el model-metadata.json completo.

    Lee feature-schema.json, preprocessor_params.json y
    model_metadata.json para producir un único archivo de metadata
    que la Fase 4 (Node.js) consumirá directamente.

    Returns:
        dict: metadata completa
    """
    print("\n" + "=" * 60)
    print("  Generando model-metadata.json")
    print("=" * 60)

    schema = _load_feature_schema()
    preproc = _load_preprocessor_params()
    model_meta = _load_model_metadata()

    risk_levels = schema["riskLevels"]
    thresholds = {}
    for level in risk_levels:
        thresholds[level["level"]] = {
            k: v for k, v in level.items() if k != "level"
        }

    metadata = {
        "schema_version": "0.2.0",
        "model_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "random_state": RANDOM_STATE,
        "feature_order": preproc["feature_names"],
        "preprocessing": {
            "medians": preproc["medians"],
            "scaler_mean": preproc["scaler_mean"],
            "scaler_scale": preproc["scaler_scale"],
        },
        "risk_categories": RISK_CATEGORIES,
        "thresholds": thresholds,
        "models": {
            cat: {
                "onnx_file": f"xgb_{cat}.onnx",
                "output_prob_name": "probabilities",
            }
            for cat in RISK_CATEGORIES
        },
        "output_spec": {
            "probability_col": 1,
            "interpretation": "probabilidad de riesgo alto en esa categoria",
            "disclaimer": (
                "Esta prediccion es una estimacion academica generada a partir del "
                "historial registrado del paciente. No constituye un diagnostico medico, "
                "no reemplaza el criterio profesional y debe utilizarse unicamente como "
                "apoyo orientativo para la revision clinica."
            ),
        },
    }

    output_path = ARTIFACTS_DIR / "model-metadata.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[OK] model-metadata.json guardado en {output_path}")

    return metadata


def copy_to_backend():
    """Copia los artefactos ONNX y metadata al backend."""
    print("\n" + "=" * 60)
    print("  Copiando artefactos al backend")
    print("=" * 60)

    BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    files_to_copy = [
        (ARTIFACTS_DIR / f"xgb_{cat}.onnx", BACKEND_MODEL_DIR / f"xgb_{cat}.onnx")
        for cat in RISK_CATEGORIES
    ] + [
        (ARTIFACTS_DIR / "model-metadata.json", BACKEND_MODEL_DIR / "model-metadata.json"),
    ]

    for src, dst in files_to_copy:
        if not src.exists():
            print(f"[WARN] No se encontró {src.name}, saltando...")
            continue
        shutil.copy2(src, dst)
        print(f"[OK] {src.name} -> {dst}")

    print(f"\n[OK] Artefactos copiados a {BACKEND_MODEL_DIR}")


def main():
    t0 = time.time()

    print("=" * 60)
    print("  FASE 3 — Exportación a ONNX y Generación de Metadata")
    print("=" * 60)

    # Paso 1: Convertir modelos a ONNX
    print("\n[Paso 1/4] Convirtiendo modelos XGBoost a ONNX...")
    models_bytes = convert_models()

    # Paso 2: Verificar paridad Python <-> ONNX
    print("\n[Paso 2/4] Verificando paridad...")
    parity_results = verify_parity(models_bytes)

    all_passed = all(r["passed"] for r in parity_results.values())
    if not all_passed:
        print("\n[FAIL] VERIFICACION DE PARIDAD FALLO - Abortando exportacion.")
        print("   Revise las diferencias por modelo arriba.")
        sys.exit(1)

    # Paso 3: Construir metadata
    print("\n[Paso 3/4] Construyendo model-metadata.json...")
    build_metadata()

    # Paso 4: Copiar al backend
    print("\n[Paso 4/4] Copiando artefactos al backend...")
    copy_to_backend()

    elapsed = time.time() - t0
    print("\n" + "=" * 60)
    print(f"  FASE 3 COMPLETADA en {elapsed:.1f}s")
    print("=" * 60)

    return models_bytes, parity_results


if __name__ == "__main__":
    main()
