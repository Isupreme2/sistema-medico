# Fase 3: Exportación a ONNX y Generación de Metadata

> **Objetivo de la Fase**
> Producir tres artefactos definitivos y versionados:
> 1. 3 modelos en formato **ONNX** (uno por categoría de riesgo), ejecutables por `onnxruntime-node`.
> 2. Un archivo `model-metadata.json` completo para que Node arme las features, interprete la salida y aplique los umbrales exactamente como en Python.
> 3. Copia de los artefactos en `backend/src/modules/prediction/model/` para que la Fase 4 arranque sin depender de Python.

---

## Decisiones de diseño adoptadas

### Preprocesado: Opción B (fuera del ONNX)
El ONNX contiene **solo el modelo XGBoost**. El preprocesado (imputación con mediana + StandardScaler) se replica en TypeScript en la Fase 4 usando los parámetros guardados en `preprocessor_params.json`. Esto da control total y una conversión más simple.

### 3 archivos ONNX separados
Un archivo por categoría: `xgb_cardiovascular.onnx`, `xgb_metabolico.onnx`, `xgb_respiratorio.onnx`. La inferencia en Node cargará los 3 por separado.

### Ruta destino en backend
`backend/src/modules/prediction/model/` — carpeta que se crea en esta fase y que la Fase 4 consumirá directamente.

---

## Estructura final de artefactos

```
backend/src/modules/prediction/model/
├── xgb_cardiovascular.onnx
├── xgb_metabolico.onnx
├── xgb_respiratorio.onnx
└── model-metadata.json
```

```
ml/risk-prediction/
├── src/
│   └── export_onnx.py           (NUEVO) conversión + verificación de paridad
├── artifacts/
│   ├── xgb_cardiovascular.onnx   (generado)
│   ├── xgb_metabolico.onnx       (generado)
│   ├── xgb_respiratorio.onnx     (generado)
│   └── model-metadata.json       (generado)
└── requirements.txt              (añadir onnxmltools, onnxruntime)
```

---

## Plan de implementación

### Paso 1 — Añadir dependencias de conversión

Añadir a `ml/risk-prediction/requirements.txt`:

```
onnxmltools>=1.11
onnxruntime>=1.16
```

### Paso 2 — Crear `ml/risk-prediction/src/export_onnx.py`

Script que orquesta toda la exportación. Funciones principales:

#### `convert_models()`
- Carga los 3 `.joblib` de `artifacts/`.
- Convierte cada uno a ONNX usando `onnxmltools.convert_xgboost()`.
- Parámetros de conversión:
  - Input type: `FloatTensorType([None, 21])`
  - Opset: 18 (fijo, documentado)
  - Nombre del input: `"float_input"`
- Guarda los 3 `.onnx` en `artifacts/`.

#### `verify_parity()`
- Carga el conjunto de prueba con `load_data()` + `build_features()`.
- Predice con el modelo Python nativo (`.joblib`).
- Predice con el modelo ONNX (`onnxruntime.InferenceSession`).
- Compara probabilidades uno a uno con tolerancia `1e-4`.
- Reporta: diferencia máxima, media, y número de casos fuera de tolerancia.

#### `build_metadata()`
- Lee `feature-schema.json`, `preprocessor_params.json` y `model_metadata.json`.
- Ensambla el `model-metadata.json` completo (estructura definida abajo).
- Lo guarda en `artifacts/`.

#### `copy_to_backend()`
- Crea `backend/src/modules/prediction/model/` si no existe.
- Copia los 3 `.onnx` y el `model-metadata.json`.

### Paso 3 — Contingencia: Compatibilidad XGBoost 3.2.0 + onnxmltools

XGBoost 3.2.0 es muy reciente y podría no ser compatible con `onnxmltools`. El script `export_onnx.py` debe detectar el error y mostrar una salida clara. El procedimiento de contingencia es:

1. Degradar XGBoost a una versión estable:
   ```bash
   pip install xgboost==2.1.3
   ```
2. Re-entrenar los 3 modelos (~3 minutos):
   ```bash
   python run_pipeline.py
   ```
3. Re-ejecutar la exportación:
   ```bash
   python src/export_onnx.py
   ```

El re-entrenamiento es viable porque:
- El dataset sintético es fijo (semilla 42).
- El pipeline es totalmente reproducible (`run_pipeline.py`).
- XGBoost 2.1.x es una versión LTS con soporte probado para `onnxmltools`.

### Paso 4 — Firma de entrada/salida de los tensores ONNX

```
Input:  "float_input" — float32[None, 21]
Output: "probabilities" — float32[None, 2]  (col 0 = P(no-alto), col 1 = P(alto))
        "label" — int64[None, 1]            (0 = no-alto, 1 = alto)
```

El orden de las 21 features en el tensor debe ser **exactamente** el de `feature_names` en `preprocessor_params.json`. Este orden queda documentado en `model-metadata.json` como `feature_order`.

### Paso 5 — Verificación de paridad (obligatoria)

El script `export_onnx.py` ejecuta automáticamente:

1. Toma el conjunto de prueba (750 casos).
2. Predice con el `.joblib` original de Python.
3. Predice con el `.onnx` via `onnxruntime`.
4. Compara las probabilidades de la clase "alto" (columna 1).
5. **Criterio de aceptación**: diferencia máxima ≤ `1e-4` para los 3 modelos.
6. Si falla, detiene la exportación y muestra las diferencias por modelo.

Esto se guarda como script versionado para re-ejecutarlo en Fase 6 (consistencia Python ↔ Node).

### Paso 6 — Construir model-metadata.json

Estructura concreta que genera `build_metadata()`:

```json
{
  "schema_version": "0.2.0",
  "model_version": "1.0.0",
  "generated_at": "2026-07-02T...",
  "random_state": 42,
  "feature_order": [
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
    "conteo_keywords_respiratorio"
  ],
  "preprocessing": {
    "medians": { "...": "..." },
    "scaler_mean": [21 floats],
    "scaler_scale": [21 floats]
  },
  "risk_categories": ["cardiovascular", "metabolico", "respiratorio"],
  "thresholds": {
    "bajo":  { "minInclusive": 0,    "maxExclusive": 0.35 },
    "medio": { "minInclusive": 0.35, "maxExclusive": 0.70 },
    "alto":  { "minInclusive": 0.70, "maxInclusive": 1.0  }
  },
  "models": {
    "cardiovascular": { "onnx_file": "xgb_cardiovascular.onnx", "output_prob_name": "probabilities" },
    "metabolico":     { "onnx_file": "xgb_metabolico.onnx",     "output_prob_name": "probabilities" },
    "respiratorio":   { "onnx_file": "xgb_respiratorio.onnx",   "output_prob_name": "probabilities" }
  },
  "output_spec": {
    "probability_col": 1,
    "interpretation": "probabilidad de riesgo alto en esa categoria",
    "disclaimer": "Esta prediccion es una estimacion academica generada a partir del historial registrado del paciente. No constituye un diagnostico medico, no reemplaza el criterio profesional y debe utilizarse unicamente como apoyo orientativo para la revision clinica."
  }
}
```

### Paso 7 — Copiar artefactos al backend

El script `export_onnx.py` copia automáticamente:

```
ml/risk-prediction/artifacts/xgb_cardiovascular.onnx       → backend/src/modules/prediction/model/xgb_cardiovascular.onnx
ml/risk-prediction/artifacts/xgb_metabolico.onnx           → backend/src/modules/prediction/model/xgb_metabolico.onnx
ml/risk-prediction/artifacts/xgb_respiratorio.onnx         → backend/src/modules/prediction/model/xgb_respiratorio.onnx
ml/risk-prediction/artifacts/model-metadata.json            → backend/src/modules/prediction/model/model-metadata.json
```

Además se crea `backend/src/modules/prediction/model/index.ts` que exporte las rutas y el metadata para que la Fase 4 solo importe desde allí.

### Paso 8 — Documentar

Actualizar `ml/risk-prediction/README.md` con:

- Herramienta usada: `onnxmltools` (o la alternativa si hubo contingencia).
- Opset fijado: 18.
- Versiones: XGBoost 3.2.0 o 2.1.x (la que funcione).
- Comando para regenerar: `cd ml/risk-prediction && python src/export_onnx.py`.
- Cómo ejecutar la verificación de paridad (incluida en el mismo script).
- Correspondencia versión del modelo ↔ versión de la metadata.

---

## Definition of Done

- [ ] `src/export_onnx.py` existe y se ejecuta sin errores.
- [ ] Los 3 archivos `.onnx` se cargan con `onnx.load()` y con `onnxruntime.InferenceSession`.
- [ ] La verificación de paridad Python ↔ ONNX pasa con tolerancia ≤ 1e-4 para los 3 modelos.
- [ ] `model-metadata.json` contiene `feature_order`, `preprocessing`, `risk_categories`, `thresholds`, `models` y `output_spec` completos.
- [ ] Los artefactos están copiados en `backend/src/modules/prediction/model/` con su archivo `index.ts`.
- [ ] El README de `ml/` documenta cómo reproducir la exportación.
- [ ] `AGENTS.md` actualizado con Fase 3 completada.
