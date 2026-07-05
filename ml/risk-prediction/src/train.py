"""
Pasos 4 y 5 — División train/val/test y entrenamiento de modelos.

Estrategia:
  - 3 clasificadores binarios XGBoost (uno por categoría de riesgo).
  - Target binario: nivel_{categoria} == 'alto' → 1, else → 0.
  - Partición estratificada 70/15/15.
  - Búsqueda ligera de hiperparámetros con validación cruzada.
"""

import json
import os
import sys
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import (
    StratifiedShuffleSplit,
    GridSearchCV,
)
from xgboost import XGBClassifier

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

RANDOM_STATE = 42
RISK_CATEGORIES = ["cardiovascular", "metabolico", "respiratorio"]
TEST_SIZE = 0.15
VAL_SIZE = 0.15

warnings.filterwarnings("ignore")


def binarize_target(y_level: pd.DataFrame, category: str) -> pd.Series:
    """Convierte nivel en binario: alto=1, bajo/medio=0."""
    return (y_level[f"nivel_{category}"] == "alto").astype(int)


def split_data(
    X: np.ndarray, y: pd.Series
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Divide en train/val/test con estratificación (70/15/15)."""
    sss = StratifiedShuffleSplit(n_splits=1, test_size=TEST_SIZE + VAL_SIZE, random_state=RANDOM_STATE)
    train_idx, temp_idx = next(sss.split(X, y))

    X_train, X_temp = X[train_idx], X[temp_idx]
    y_train, y_temp = y.iloc[train_idx], y.iloc[temp_idx]

    val_ratio = VAL_SIZE / (TEST_SIZE + VAL_SIZE)
    sss2 = StratifiedShuffleSplit(n_splits=1, test_size=val_ratio, random_state=RANDOM_STATE)
    val_idx, test_idx = next(sss2.split(X_temp, y_temp))

    X_val, X_test = X_temp[val_idx], X_temp[test_idx]
    y_val, y_test = y_temp.iloc[val_idx], y_temp.iloc[test_idx]

    return X_train, X_val, X_test, y_train, y_val, y_test


def compute_class_weight(y: pd.Series) -> float:
    """Calcula scale_pos_weight para XGBoost (neg/pos ratio)."""
    neg = (y == 0).sum()
    pos = (y == 1).sum()
    return neg / max(pos, 1)


def train_category_model(
    X_train: np.ndarray, y_train: pd.Series,
    X_val: np.ndarray, y_val: pd.Series,
    category: str,
) -> XGBClassifier:
    """Entrena un XGBoost binario para una categoría con búsqueda de hps."""
    scale_pos_weight = compute_class_weight(y_train)
    print(f"\n[ENTRENANDO] {category} (scale_pos_weight={scale_pos_weight:.2f})")
    print(f"             Train: {len(y_train)} (alto={y_train.sum()})")
    print(f"             Val:   {len(y_val)} (alto={y_val.sum()})")

    base_model = XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbosity=0,
    )

    param_grid = {
        "n_estimators": [100, 200],
        "max_depth": [3, 5, 7],
        "learning_rate": [0.01, 0.05, 0.1],
        "scale_pos_weight": [scale_pos_weight],
        "subsample": [0.8, 1.0],
        "colsample_bytree": [0.8, 1.0],
    }

    X_combined = np.vstack([X_train, X_val])
    y_combined = pd.concat([y_train, y_val])

    gs = GridSearchCV(
        base_model,
        param_grid,
        cv=3,
        scoring="roc_auc",
        n_jobs=1,
        verbose=0,
    )
    gs.fit(X_combined, y_combined)

    best = gs.best_estimator_
    print(f"  Mejores hiperparámetros: {gs.best_params_}")
    print(f"  Mejor CV AUC: {gs.best_score_:.4f}")

    return best


def save_model(model: XGBClassifier, category: str) -> None:
    path = ARTIFACTS_DIR / f"xgb_{category}.joblib"
    joblib.dump(model, path)
    print(f"[OK] Modelo {category} guardado en {path}")


def save_metadata(models: dict, splits: dict) -> None:
    metadata = {
        "random_state": RANDOM_STATE,
        "risk_categories": RISK_CATEGORIES,
        "strategy": "binary_classification_per_category",
        "target_transform": "nivel_alto -> 1, bajo/medio -> 0",
        "splits": {
            "train_size": int(splits["X_train"].shape[0]),
            "val_size": int(splits["X_val"].shape[0]),
            "test_size": int(splits["X_test"].shape[0]),
        },
        "models": {},
    }
    for cat, model in models.items():
        metadata["models"][cat] = {
            "type": str(type(model).__name__),
            "best_params": model.get_params(),
            "n_features": model.n_features_in_ if hasattr(model, "n_features_in_") else None,
        }

    path = ARTIFACTS_DIR / "model_metadata.json"
    with open(path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[OK] Metadata guardada en {path}")


def train_pipeline(X: np.ndarray, y_level: pd.DataFrame) -> dict:
    """Orquesta el entrenamiento completo."""
    models = {}
    splits = {}

    for cat in RISK_CATEGORIES:
        y_bin = binarize_target(y_level, cat)

        X_train, X_val, X_test, y_train, y_val, y_test = split_data(X, y_bin)

        model = train_category_model(X_train, y_train, X_val, y_val, cat)
        save_model(model, cat)
        models[cat] = model

        if cat == RISK_CATEGORIES[0]:
            splits.update(
                X_train=X_train, X_val=X_val, X_test=X_test,
                y_train=y_train, y_val=y_val, y_test=y_test,
            )

    # Todas las categorías usan el mismo split
    splits.update(
        X_train=X_train, X_val=X_val, X_test=X_test,
        y_train=y_train, y_val=y_val, y_test=y_test,
    )

    save_metadata(models, splits)

    return models, splits


if __name__ == "__main__":
    from load_data import load_data
    from build_features import build_features

    X_df, y_prob, y_level, feature_names = load_data()
    X_t, pp = build_features(X_df, fit=True)

    models, splits = train_pipeline(X_t, y_level)
    print(f"\n[OK] Entrenamiento completado para {len(models)} categorías")
