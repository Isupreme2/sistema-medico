#!/usr/bin/env python3
"""
Orquestador completo de la Fase 2.

Ejecuta secuencialmente:
  1. Carga y validación
  2. Construcción de features + salvado de preprocesador
  3. Entrenamiento de modelos
  4. Evaluación + SHAP

Uso:
    python run_pipeline.py
"""

import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR / "src"))

from load_data import load_data, RISK_CATEGORIES
from build_features import build_features
from train import train_pipeline, split_data, binarize_target as train_binarize
from evaluate import evaluate_pipeline


def main():
    t0 = time.time()

    print("=" * 60)
    print("  FASE 2 — Entrenamiento, Evaluación y Versionado del Modelo")
    print("=" * 60)

    print("\n[Paso 2] Cargando y validando datos...")
    X_df, y_prob, y_level, feature_names = load_data()

    print("\n[Paso 3] Construyendo features...")
    X_t, pp = build_features(X_df, fit=True)

    print("\n[Paso 4-5] Entrenando modelos...")
    y_bin_0 = train_binarize(y_level, RISK_CATEGORIES[0])
    splits = split_data(X_t, y_bin_0)
    X_train, X_val, X_test, y_train, y_val, y_test = splits

    models, _ = train_pipeline(X_t, y_level)

    print("\n[Paso 6-7] Evaluando modelos y calculando SHAP...")
    all_metrics = evaluate_pipeline(
        X_test, y_level, y_test.index.values, feature_names,
    )

    elapsed = time.time() - t0
    print("\n" + "=" * 60)
    print(f"  FASE 2 COMPLETADA en {elapsed:.1f}s")
    print("=" * 60)

    print("\nResumen de metricas (conjunto de prueba):")
    for cat, m in all_metrics.items():
        print(f"  {cat}: AUC={m['auc_roc']:.4f}, "
              f"Precision={m['precision']:.4f}, "
              f"Recall={m['recall']:.4f}, "
              f"F1={m['f1_score']:.4f}, "
              f"Nivel-Acc={m.get('nivel_accuracy', 'N/A')}")

    print(f"\nArticulos generados en artifacts/:")
    for f in sorted((BASE_DIR / "artifacts").iterdir()):
        print(f"  {f.name}")
    print(f"\nArticulos generados en metrics/:")
    for f in sorted((BASE_DIR / "metrics").iterdir()):
        print(f"  {f.name}")

    return all_metrics


if __name__ == "__main__":
    main()
