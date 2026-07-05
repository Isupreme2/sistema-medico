"""
Paso 2 — Carga y validación del dataset contra feature-schema.json.

Carga synthetic-risk-dataset.csv y verifica que cumple el contrato
de las 21 features definidas en Fase 0.
"""

import json
import os
import sys
from pathlib import Path

import pandas as pd

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent
SCHEMA_PATH = BASE_DIR / "feature-schema.json"
DATA_PATH = BASE_DIR / "synthetic-risk-dataset.csv"

RISK_CATEGORIES = ["cardiovascular", "metabolico", "respiratorio"]


def load_schema() -> dict:
    with open(SCHEMA_PATH) as f:
        return json.load(f)


def get_feature_names(schema: dict) -> list[str]:
    return [ft["name"] for ft in schema["features"]]


def get_target_columns() -> list[str]:
    return [f"target_{c}" for c in RISK_CATEGORIES]


def get_level_columns() -> list[str]:
    return [f"nivel_{c}" for c in RISK_CATEGORIES]


def validate_columns(df: pd.DataFrame, feature_names: list[str]) -> None:
    missing = [c for c in feature_names if c not in df.columns]
    if missing:
        raise ValueError(f"Faltan features en CSV: {missing}")

    extra = [c for c in feature_names if c not in df.columns]
    target_cols = get_target_columns()
    level_cols = get_level_columns()
    all_expected = feature_names + target_cols + level_cols
    unknown = [c for c in df.columns if c not in all_expected]
    if unknown:
        print(f"[WARN] Columnas extra en CSV (se ignorarán): {unknown}")


def validate_ranges(df: pd.DataFrame, feature_names: list[str]) -> None:
    for col in feature_names:
        if col.startswith("conteo_keywords"):
            continue
        null_pct = df[col].isna().mean() * 100
        if null_pct > 50:
            print(f"[WARN] {col}: {null_pct:.1f}% valores nulos")


def load_data() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, list[str]]:
    schema = load_schema()
    feature_names = get_feature_names(schema)

    df = pd.read_csv(DATA_PATH)

    validate_columns(df, feature_names)
    validate_ranges(df, feature_names)

    X = df[feature_names].copy()
    prob_cols = get_target_columns()
    level_cols = get_level_columns()

    y_prob = df[prob_cols].copy()
    y_level = df[level_cols].copy()

    print(f"[OK] Cargadas {len(df)} filas y {len(feature_names)} features")
    print(f"[OK] Features nulas por columna:")
    null_report = X.isna().sum()
    for col in feature_names:
        n = null_report[col]
        if n > 0:
            print(f"      {col}: {n} nulos ({n/len(X)*100:.1f}%)")

    for cat in RISK_CATEGORIES:
        dist = y_level[f"nivel_{cat}"].value_counts()
        pct = (dist / len(y_level) * 100).round(1)
        print(f"\n[OK] Distribucion {cat}:")
        for nivel in ["bajo", "medio", "alto"]:
            print(f"      {nivel}: {dist.get(nivel, 0)} ({pct.get(nivel, 0)}%)")

    return X, y_prob, y_level, feature_names


if __name__ == "__main__":
    load_data()
