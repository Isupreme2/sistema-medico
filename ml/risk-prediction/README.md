# Predicción de Riesgo Clínico — Módulo ML

## Estado del proyecto

| Fase | Estado | Descripción |
|------|--------|-------------|
| Fase 0 | ✅ | Contratos: `feature-schema.json`, `output-contract.json` |
| Fase 1 | ✅ | Dataset sintético (5000 pacientes, 21 features, 3 categorías) |
| **Fase 2** | **✅** | **Entrenamiento XGBoost, evaluación, SHAP, artifacts versionados** |
| **Fase 3** | **✅** | **Export ONNX + metadata (onnxmltools, opset 15, paridad 1e-7)** |
| Fase 4 | ⬜ | Módulo `prediction` en backend Node.js |
| Fase 5 | ⬜ | Integración UI en historial médico |
| Fase 6 | ⬜ | Tests de featureBuilder y consistencia Python vs Node |

## Requisitos

```bash
pip install pandas numpy scikit-learn xgboost shap matplotlib seaborn joblib onnxmltools onnxruntime
```

## Estructura

```
ml/risk-prediction/
├── feature-schema.json          # Contrato de features (Fase 0)
├── output-contract.json         # Contrato de salida del API (Fase 0)
├── synthetic-risk-dataset.csv   # Dataset generado (Fase 1)
├── synthetic-medical-histories.jsonl  # Historiales sintéticos (Fase 1)
├── requirements.txt             # Dependencias fijadas
├── README.md                    # Este archivo
├── src/
│   ├── load_data.py             # Carga + validación contra schema
│   ├── build_features.py        # Preprocesado (imputación + scaler)
│   ├── train.py                 # Entrenamiento XGBoost por categoría
│   ├── evaluate.py              # Métricas + SHAP
│   └── export_onnx.py           # (Fase 3) Export ONNX + paridad + metadata
├── artifacts/                   # Modelos + preprocesador + metadata
│   ├── scaler.joblib
│   ├── preprocessor_params.json
│   ├── xgb_{categoria}.joblib
│   ├── xgb_{categoria}.onnx     # (Fase 3) ONNX exportado
│   ├── model_metadata.json
│   ├── model-metadata.json      # (Fase 3) Metadata completa para Node
│   └── shap_top_features_{categoria}.json
├── metrics/                     # Reportes y gráficos de evaluación
│   ├── evaluation_report.json
│   ├── roc_curve_{categoria}.png
│   ├── confusion_matrix_{categoria}.png
│   ├── shap_summary_{categoria}.png
│   └── shap_importance_{categoria}.png
└── run_pipeline.py              # Orquestador
```

## Reproducir entrenamiento

```bash
cd ml/risk-prediction
pip install -r requirements.txt
python generar_dataset.py        # Solo si quieres regenerar el dataset
python run_pipeline.py           # Entrenamiento + evaluación completa
```

## Estrategia de modelado

- **3 clasificadores binarios** XGBoost, uno por categoría de riesgo.
- Target: `nivel_{categoria} == 'alto'` → 1, `bajo/medio` → 0.
- Partición estratificada 70/15/15.
- Búsqueda de hiperparámetros con GridSearchCV (3-fold CV).
- `scale_pos_weight` para manejar desbalance de clases.

## Preprocesado (única fuente de verdad)

1. Imputación de nulos con la **mediana** de cada feature.
2. Escalado **StandardScaler** (media 0, desviación 1).

Parámetros guardados en `artifacts/preprocessor_params.json` para
reproducir idénticamente en Node.js (Fase 4).

## Semilla

`random_state = 42` en todo el pipeline. El entrenamiento es determinista
y reproducible.

## SHAP

Los valores SHAP se calculan sobre el conjunto de prueba y se guardan:
- `shap_summary_{categoria}.png` — gráfico de dispersión SHAP.
- `shap_importance_{categoria}.png` — importancia global (barras).
- `shap_top_features_{categoria}.json` — top 5 features con su SHAP medio absoluto.

## Export ONNX (Fase 3)

Los 3 modelos XGBoost se exportan a formato ONNX para inferencia en Node.js
via `onnxruntime-node`.

### Herramienta

- **onnxmltools** — conversión XGBoost → ONNX.
- **onnxruntime** — verificación de paridad en Python.

### Opset

Fijado en **15** (máximo soportado por onnxmltools para XGBoost).

### Versiones probadas

- XGBoost 3.2.0
- onnxmltools 1.16.0
- onnxruntime 1.27.0
- ONNX 1.22.0

### Regenerar

```bash
cd ml/risk-prediction
pip install -r requirements.txt
python src/export_onnx.py
```

El script ejecuta automáticamente:

1. Conversión de los 3 modelos a ONNX.
2. **Verificación de paridad**: compara probabilidades Python ↔ ONNX
   con tolerancia ≤ 1e-4. Si falla, aborta la exportación.
3. Generación de `model-metadata.json` con `feature_order`,
   `preprocessing`, `risk_categories`, `thresholds`, `models` y
   `output_spec`.
4. Copia de artefactos a `backend/src/modules/prediction/model/`.

### Verificación de paridad

La diferencia máxima observada entre Python nativo y ONNX es del orden
de **1e-7** (muy por debajo del criterio de 1e-4).

### Artefactos generados

```
ml/risk-prediction/artifacts/
├── xgb_cardiovascular.onnx      ~75 KB
├── xgb_metabolico.onnx          ~43 KB
├── xgb_respiratorio.onnx        ~42 KB
└── model-metadata.json          Metadata completa para Node.js

backend/src/modules/prediction/model/  (copia automática)
├── xgb_cardiovascular.onnx
├── xgb_metabolico.onnx
├── xgb_respiratorio.onnx
├── model-metadata.json
└── index.ts                     Exporta rutas y metadata tipada
```

### Contingencia XGBoost 3.x

Si `onnxmltools` falla con XGBoost 3.2.0, degradar a 2.1.3:

```bash
pip install xgboost==2.1.3
python run_pipeline.py           # Re-entrenar (~3 min)
python src/export_onnx.py        # Re-exportar
```

El pipeline es reproducible gracias a la semilla fija 42.
