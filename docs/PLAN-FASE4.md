# Fase 4: Implementacion del modulo `prediction`

## Objetivo

Implementar el modulo `prediction` en el backend **Express + TypeScript**, de manera que:

- Cargue los **3 modelos ONNX** una sola vez al iniciar el servidor.
- Construya las **features** a partir del historial del paciente replicando exactamente el pipeline de Python.
- Ejecute la inferencia mediante `onnxruntime-node`.
- Aplique los umbrales definidos en la metadata.
- Exponga una ruta protegida que devuelva el contrato de salida definido en la **Fase 0**.

---

## Decisiones de diseno adoptadas

Durante la revision del plan se tomaron las siguientes decisiones:

| Decision | Opcion elegida |
|----------|---------------|
| Inicializacion de modelos | **PredictionEngine clase** — inicializada en bootstrap con fail-fast |
| Factores explicativos | **Reglas clinicas** — ~12 reglas con umbrales (en lugar de SHAP estatico) |
| Datos insuficientes | **< 1 consulta con signos vitales O < 2 consultas totales** |
| Estructura de archivos | **7 archivos separados** — responsabilidad unica por archivo |

---

## Estructura final del modulo

```
backend/src/modules/prediction/
├── model/
│   ├── index.ts                          # Tipos, helpers, validateAssets()
│   ├── model-metadata.json               # Metadata de los 3 modelos ONNX
│   ├── xgb_cardiovascular.onnx
│   ├── xgb_metabolico.onnx
│   └── xgb_respiratorio.onnx
├── prediction.engine.ts                  # PredictionEngine (singleton, bootstrap)
├── prediction.featureBuilder.ts          # buildFeatures() — funcion pura
├── prediction.factors.ts                 # evaluateFactors() — reglas clinicas
├── prediction.service.ts                 # Orquestador del flujo completo
├── prediction.controller.ts              # Handlers HTTP
├── prediction.routes.ts                  # Rutas + documentacion Swagger
└── prediction.validation.ts              # Validacion Zod
```

---

## Flujo de la prediccion

```
Request GET /api/v1/predictions/paciente/:id
    │
    ▼
authenticate + authorize(MEDICO, ADMIN)
    │
    ▼
validate(getPredictionSchema)  ← valida :id como ObjectId
    │
    ▼
prediction.controller.getPrediction()
    │
    ▼
prediction.service.getPrediction(pacienteId)
    │
    ├── User.findById(pacienteId) → 404 si no existe o no es PACIENTE
    │
    ├── MedicalRecord.find({ pacienteId }).sort({ fecha: -1 })
    │
    ├── buildFeatures(records, metadata)
    │   │
    │   ├── Si < 2 consultas totales O < 1 con signos vitales → null
    │   │   └── Respuesta: { estado: "datos_insuficientes", categorias: [] }
    │   │
    │   └── Calcula 21 features en orden metadata.feature_order
    │       ├── Imputa nulos con mediana
    │       └── Escala con StandardScaler (mean/scale de metadata)
    │
    ├── Para cada categoria (cardiovascular, metabolico, respiratorio):
    │   ├── predictionEngine.predict(categoria, tensor)
    │   │   ├── session.run({ float_input: tensor })
    │   │   └── Devuelve probabilities[0][probability_col] o null si error
    │   ├── determinarNivel(prob, thresholds)
    │   └── evaluateFactors(categoria, rawFeatures) → string[]
    │
    └── Respuesta: { estado: "ok", categorias: [...], disclaimer }
```

---

## Componentes implementados

### 1. `model/index.ts` — modificado

Se anadio la funcion `validateAssets()` que verifica que los 3 archivos `.onnx` existen en disco antes de que el engine los cargue.

### 2. `prediction.engine.ts` — PredictionEngine

Clase singleton que se inicializa durante el bootstrap (`server.ts`):

- **initialize()**: Carga los 3 modelos ONNX como `InferenceSession`. Verifica que cada modelo tenga los inputs/outputs esperados (`float_input` → `probabilities`). Falla rapido si algun ONNX esta corrupto o ausente.
- **predict(category, tensor)**: Ejecuta inferencia para una categoria. Devuelve `number | null` (null si hubo error, sin lanzar excepcion).
- **getMetadata()**: Expone la metadata cargada.

```typescript
// Uso en server.ts
try {
  await predictionEngine.initialize();
  logger.info("Modelos ONNX cargados correctamente");
} catch (err) {
  logger.error("Error al cargar modelos ONNX:", err);
  // El servidor arranca igual, /predictions devolvera error_inferencia
}
```

### 3. `prediction.featureBuilder.ts` — Funcion pura

Replica el pipeline de Python. Funcion principal:

```typescript
export function buildFeatures(
  records: IMedicalRecord[],
  metadata: ModelMetadata,
): FeatureResult | null;
```

**Regla de datos insuficientes**: retorna `null` si `total_consultas < 2` o `consultas_con_signos_vitales < 1`.

**Las 21 features** se calculan en el orden exacto de `metadata.feature_order`:

| # | Feature | Fuente |
|---|---------|--------|
| 1-4 | total_consultas, consultas_con_signos_vitales, dias_desde_ultima_consulta, intervalo_promedio_dias | Records |
| 5-7 | presion_sistolica_ultima/promedio/maxima | signosVitales.presionSistolica |
| 8-9 | presion_diastolica_ultima/promedio | signosVitales.presionDiastolica |
| 10-11 | frecuencia_cardiaca_ultima/promedio | signosVitales.frecuenciaCardiaca |
| 12-14 | glucosa_ultima/promedio/maxima | signosVitales.glucosa |
| 15 | imc_ultimo | peso/(talla/100)^2 |
| 16-17 | saturacion_o2_ultima/minima | signosVitales.saturacionO2 |
| 18 | temperatura_maxima | signosVitales.temperatura |
| 19-21 | conteo_keywords_* | Regex en motivo+diagnostico+notas+cie10 |

**Preprocesamiento**: imputacion con mediana (desde `metadata.preprocessing.medians`) + escalado `(valor - mean) / scale`.

### 4. `prediction.factors.ts` — Reglas clinicas

12 reglas distribuidas en 3 categorias. Ejemplos:

| Categoria | Regla | Umbral |
|-----------|-------|--------|
| cardiovascular | Presion sistolica maxima elevada | > 140 |
| cardiovascular | Presion sistolica ultima elevada | > 130 |
| metabolico | Glucosa maxima elevada | > 126 |
| metabolico | IMC elevado | > 30 |
| respiratorio | saturacion O2 minima baja | < 92 |
| respiratorio | Fiebre alta registrada | > 38 |

### 5. `prediction.service.ts` — Orquestador

```typescript
export interface PredictionResponse {
  pacienteId: string;
  generadoEn: string;
  horizonte: "proxima_visita";
  estado: "ok" | "datos_insuficientes" | "error_inferencia";
  categorias: CategoriaPrediccion[];
  disclaimer: string;
}
```

Flujo completo: verifica paciente → obtiene records → construye features → infiere 3 modelos → aplica umbrales → evalua factores → arma respuesta.

### 6. `prediction.controller.ts`

Handler unico `getPrediction` envuelto en `asyncHandler`, siguiendo el patron de los demas modulos.

### 7. `prediction.routes.ts`

```http
GET /api/v1/predictions/paciente/:id
```

Protegido con `authenticate` + `authorize(MEDICO, ADMIN)`. Incluye documentacion Swagger inline con OpenAPI 3.0.3.

### 8. `prediction.validation.ts`

Validacion Zod del parametro `:id` como ObjectId de 24 caracteres hex.

---

## Manejo de errores

| Caso | HTTP | Respuesta |
|------|------|-----------|
| Paciente inexistente | 404 | `AppError.notFound("Paciente no encontrado")` |
| :id no es ObjectId | 422 | Error de validacion Zod |
| Historial insuficiente | 200 | `{ estado: "datos_insuficientes", categorias: [] }` |
| Error de inferencia | 200 | `{ estado: "error_inferencia" }` (todas las categorias en 0) |
| Modelo no inicializado | 200 | `predict()` devuelve `null` → se maneja como error_inferencia |

Ningun error de inferencia detiene el servidor ni propaga una excepcion no manejada.

---

## Dependencias

- `onnxruntime-node@1.27.0` — runtime de ONNX para Node.js (binarios nativos)
- TypeScript `^5.x` con `resolveJsonModule: true`

---

## Definition of Done

- [x] `onnxruntime-node` instalado y compila correctamente
- [x] `predictionEngine.initialize()` carga los 3 ONNX una sola vez al arrancar
- [x] Las sesiones se reutilizan durante toda la vida de la aplicacion
- [x] `buildFeatures()` genera las 21 features en el orden correcto
- [x] `buildFeatures()` devuelve `null` si datos insuficientes (< 2 consultas O < 1 con signos)
- [x] `evaluateFactors()` devuelve mensajes segun umbrales clinicos (~12 reglas)
- [x] `getPrediction()` orquesta todo el flujo: historial → features → inferencia → respuesta
- [x] `GET /predictions/paciente/:id` devuelve el contrato de salida completo
- [x] Endpoint protegido para Medico/Admin (authenticate + authorize)
- [x] Paciente inexistente → 404
- [x] Historial insuficiente → 200 con `estado: "datos_insuficientes"`
- [x] Error de inferencia → no detiene el servidor
- [x] Endpoint documentado en Swagger con OpenAPI 3.0.3
- [x] `lint`, `typecheck` y `test` (31/31) pasan sin errores
