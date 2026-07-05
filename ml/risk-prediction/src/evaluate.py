"""
Pasos 6 y 7 — Evaluación y explicabilidad con SHAP.

Genera:
  - Métricas por clase: AUC-ROC, precisión, recall, F1
  - Matriz de confusión
  - Curvas ROC
  - Importancia SHAP global
  - Reporte JSON en metrics/
  - Gráficos en metrics/
"""

import json
import os
import warnings
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import (
    roc_auc_score,
    roc_curve,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
    ConfusionMatrixDisplay,
)

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
METRICS_DIR = BASE_DIR / "metrics"
METRICS_DIR.mkdir(parents=True, exist_ok=True)

RISK_CATEGORIES = ["cardiovascular", "metabolico", "respiratorio"]
RANDOM_STATE = 42

warnings.filterwarnings("ignore")

BAJO_MAX = 0.35
MEDIO_MAX = 0.70


def nivel_desde_probabilidad(prob: float) -> str:
    if prob >= MEDIO_MAX:
        return "alto"
    elif prob >= BAJO_MAX:
        return "medio"
    return "bajo"


def evaluate_model(
    model: object, X_test: np.ndarray, y_test: pd.Series,
    category: str, feature_names: list[str],
) -> tuple[dict, np.ndarray]:
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)

    auc = roc_auc_score(y_test, y_prob)

    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="binary", pos_label=1, zero_division=0
    )

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0

    metrics = {
        "categoria": category,
        "auc_roc": round(auc, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "specificity": round(specificity, 4),
        "true_positives": int(tp),
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "total_test": len(y_test),
        "prevalence_alto": float(y_test.mean()),
    }

    print(f"\n=== Evaluacion: {category} ===")
    print(f"AUC-ROC:     {metrics['auc_roc']:.4f}")
    print(f"Precision:   {metrics['precision']:.4f}")
    print(f"Recall:      {metrics['recall']:.4f}")
    print(f"F1:          {metrics['f1_score']:.4f}")
    print(f"Specificity: {metrics['specificity']:.4f}")
    print(f"CM: TN={tn} FP={fp} FN={fn} TP={tp}")

    # Curva ROC
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot(fpr, tpr, label=f"AUC = {auc:.3f}")
    ax.plot([0, 1], [0, 1], "k--", alpha=0.5)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(f"ROC - {category.capitalize()}")
    ax.legend(loc="lower right")
    plt.tight_layout()
    roc_path = METRICS_DIR / f"roc_curve_{category}.png"
    fig.savefig(roc_path, dpi=150)
    plt.close(fig)
    print(f"[OK] Curva ROC guardada: {roc_path}")

    # Matriz de confusión
    disp = ConfusionMatrixDisplay(
        confusion_matrix=cm,
        display_labels=["No alto", "Alto"],
    )
    fig, ax = plt.subplots(figsize=(5, 4))
    disp.plot(ax=ax, cmap="Blues", values_format="d")
    ax.set_title(f"Matriz de Confusion - {category.capitalize()}")
    plt.tight_layout()
    cm_path = METRICS_DIR / f"confusion_matrix_{category}.png"
    fig.savefig(cm_path, dpi=150)
    plt.close(fig)
    print(f"[OK] Matriz de confusion guardada: {cm_path}")

    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    metrics["classification_report"] = report

    return metrics, y_prob


def compute_shap(
    model: object, X_test: np.ndarray,
    feature_names: list[str], category: str,
) -> None:
    print(f"\n[SHAP] Calculando para {category}...")

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test)

    shap.summary_plot(
        shap_values, X_test,
        feature_names=feature_names,
        show=False,
    )
    shap_path = METRICS_DIR / f"shap_summary_{category}.png"
    plt.tight_layout()
    plt.savefig(shap_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[OK] SHAP summary guardado: {shap_path}")

    plt.figure(figsize=(10, 6))
    shap.summary_plot(
        shap_values, X_test,
        feature_names=feature_names,
        plot_type="bar",
        show=False,
    )
    bar_path = METRICS_DIR / f"shap_importance_{category}.png"
    plt.tight_layout()
    plt.savefig(bar_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[OK] SHAP feature importance guardado: {bar_path}")

    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    top_indices = np.argsort(mean_abs_shap)[::-1][:5]

    top_features = [
        {
            "feature": feature_names[i],
            "mean_abs_shap": float(round(mean_abs_shap[i], 4)),
        }
        for i in top_indices
    ]

    shap_values_path = ARTIFACTS_DIR / f"shap_top_features_{category}.json"
    with open(shap_values_path, "w") as f:
        json.dump(top_features, f, indent=2)
    print(f"[OK] Top 5 SHAP features guardadas: {shap_values_path}")


def binarize_target(y_level: pd.DataFrame, category: str) -> pd.Series:
    return (y_level[f"nivel_{category}"] == "alto").astype(int)


def evaluate_pipeline(
    X_test: np.ndarray, y_level: pd.DataFrame,
    test_indices: np.ndarray, feature_names: list[str],
) -> dict:
    """Evalúa todos los modelos. y_level es el DataFrame completo de niveles,
    test_indices son los índices de las filas de prueba."""
    all_metrics = {}

    y_level_test = y_level.iloc[test_indices]

    for cat in RISK_CATEGORIES:
        model_path = ARTIFACTS_DIR / f"xgb_{cat}.joblib"
        if not model_path.exists():
            print(f"[SKIP] No se encontró modelo para {cat}")
            continue

        model = joblib.load(model_path)
        y_test_bin = binarize_target(y_level_test, cat)

        metrics_dict, y_prob = evaluate_model(
            model, X_test, y_test_bin, cat, feature_names
        )
        all_metrics[cat] = metrics_dict

        # Distribución de niveles predichos vs reales
        niveles_pred = [nivel_desde_probabilidad(p) for p in y_prob]
        niveles_real = y_level_test[f"nivel_{cat}"].tolist()
        acuerdo = sum(1 for a, b in zip(niveles_pred, niveles_real) if a == b)
        metrics_dict["nivel_accuracy"] = round(acuerdo / len(niveles_pred), 4)
        print(f"  Nivel accuracy (bajo/medio/alto): {metrics_dict['nivel_accuracy']:.4f}")

        compute_shap(model, X_test, feature_names, cat)

    report_path = METRICS_DIR / "evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(all_metrics, f, indent=2)
    print(f"\n[OK] Reporte completo guardado: {report_path}")

    return all_metrics


if __name__ == "__main__":
    from load_data import load_data
    from build_features import build_features
    from train import split_data, binarize_target as train_binarize

    X_df, y_prob, y_level, feature_names = load_data()
    X_t, pp = build_features(X_df, fit=False)

    y_bin_0 = binarize_target(y_level, RISK_CATEGORIES[0])
    X_train, X_val, X_test, y_train, y_val, y_test = split_data(X_t, y_bin_0)

    evaluate_pipeline(X_test, y_level, y_test.index.values, feature_names)
