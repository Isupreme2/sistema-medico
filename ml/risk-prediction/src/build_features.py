"""
Paso 3 — Construcción del vector de features (única fuente de verdad).

Pasos:
  1. Imputar nulos con la mediana de cada feature.
  2. Escalar con StandardScaler (media 0, desviación 1).
  3. Guardar parámetros en artifacts/ para reproducir en Fase 4.

Toda transformación aquí debe ser replicable en TypeScript + numéricamente
estable. Se evitan transformaciones no lineales o complejas.
"""

import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


def get_preprocessor_params() -> dict:
    """Devuelve la metadata del preprocesado para exportar a Node en Fase 4."""
    params_path = ARTIFACTS_DIR / "preprocessor_params.json"
    if params_path.exists():
        with open(params_path) as f:
            return json.load(f)
    return {}


class FeaturePreprocessor:
    """
    Preprocesamiento determinista y reproducible.

    Atributos guardados (accesibles para exportar a Node):
      - feature_names_: orden exacto de columnas
      - medians_: dict {feature: valor} para imputación
      - scaler_: StandardScaler ajustado
    """

    def __init__(self):
        self.feature_names_: list[str] = []
        self.medians_: dict[str, float] = {}
        self.scaler_: StandardScaler | None = None

    def fit(self, X: pd.DataFrame) -> "FeaturePreprocessor":
        self.feature_names_ = list(X.columns)

        self.medians_ = {
            col: float(X[col].median()) if X[col].isna().any() else None
            for col in self.feature_names_
        }

        X_imputed = X.fillna(X.median())

        finite_mask = np.isfinite(X_imputed.values)
        if not finite_mask.all():
            X_imputed = X_imputed.where(finite_mask, 0)

        self.scaler_ = StandardScaler().fit(X_imputed)

        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        X_imputed = X.copy()

        for col in self.feature_names_:
            med = self.medians_.get(col)
            if med is not None:
                mask = X_imputed[col].isna()
                if mask.any():
                    X_imputed.loc[mask, col] = med

        X_imputed = X_imputed[self.feature_names_]

        finite_mask = np.isfinite(X_imputed.values)
        if not finite_mask.all():
            X_imputed = X_imputed.where(finite_mask, 0)

        return self.scaler_.transform(X_imputed.values)

    def save(self) -> None:
        scaler_path = ARTIFACTS_DIR / "scaler.joblib"
        joblib.dump(self.scaler_, scaler_path)

        params = {
            "feature_names": self.feature_names_,
            "medians": self.medians_,
            "scaler_mean": self.scaler_.mean_.tolist() if self.scaler_ else None,
            "scaler_scale": self.scaler_.scale_.tolist() if self.scaler_ else None,
            "n_features_in_": int(self.scaler_.n_features_in_) if self.scaler_ else None,
        }
        params_path = ARTIFACTS_DIR / "preprocessor_params.json"
        with open(params_path, "w") as f:
            json.dump(params, f, indent=2)

        print(f"[OK] Preprocesador guardado en {ARTIFACTS_DIR}")

    @classmethod
    def load(cls) -> "FeaturePreprocessor":
        pp = cls()
        params_path = ARTIFACTS_DIR / "preprocessor_params.json"
        with open(params_path) as f:
            params = json.load(f)

        pp.feature_names_ = params["feature_names"]
        pp.medians_ = params["medians"]

        scaler_path = ARTIFACTS_DIR / "scaler.joblib"
        pp.scaler_ = joblib.load(scaler_path)

        return pp


def build_features(X: pd.DataFrame, fit: bool = True) -> tuple[np.ndarray, FeaturePreprocessor]:
    if fit:
        preprocessor = FeaturePreprocessor()
        preprocessor.fit(X)
        preprocessor.save()
    else:
        preprocessor = FeaturePreprocessor.load()

    X_transformed = preprocessor.transform(X)
    return X_transformed, preprocessor


if __name__ == "__main__":
    from load_data import load_data

    X, y_prob, y_level, feature_names = load_data()
    X_t, pp = build_features(X, fit=True)
    print(f"[OK] Features construidas: shape={X_t.shape}")
    print(f"[OK] Features orden: {pp.feature_names_}")
