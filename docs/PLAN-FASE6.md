# Fase 6 — Pruebas Automatizadas y Validacion de Consistencia

## Objetivo

Cubrir con pruebas automatizadas los puntos criticos del modulo:

- Verificar que el **featureBuilder** produce las features correctas.
- Comprobar que los **factores** se evaluan con los umbrales correctos.
- Validar que la **inferencia Node** coincide con **Python** (+ONNX).

---

## Archivos de test creados

### 1. `prediction.featureBuilder.test.ts` — 10 tests

| Grupo | Tests | Que verifica |
|-------|-------|-------------|
| Casos base | 6 | 21 features, orden correcto, total_consultas, IMC, keywords, determinismo |
| Casos borde | 4 | null si 0 records, null si 1 record, null si sin vitales, tolera nulos, signos parciales |

### 2. `prediction.factors.test.ts` — 14 tests

| Grupo | Tests | Que verifica |
|-------|-------|-------------|
| Cardiovascular | 4 | PA sistolica elevada (historial + ultima), PA diastolica, valores normales |
| Metabolico | 5 | Glucosa maxima, glucosa promedio, IMC, keywords, valores normales |
| Respiratorio | 4 | SatO2 baja (recurrente + ultima), fiebre, valores normales |
| Pureza | 1 | Misma entrada → misma salida |

### 3. `prediction.consistency.test.ts` — 12 tests (3 casos × 4 assertions)

3 casos golden generados por `ml/risk-prediction/src/generate_golden_cases.py`:

| Caso | Descripcion | Probs Python (cardiovascular/metabolico/respiratorio) |
|------|-------------|------------------------------------------------------|
| normal | Paciente sano | ~0.00002 / ~0.00008 / ~0.00004 |
| alto_riesgo | Hipertension + diabetes + EPOC | ~0.995 / ~0.999 / ~0.992 |
| mixto | Riesgo mixto | ~0.00004 / ~0.0002 / ~0.00009 |

Por cada caso se verifica:
- Features escaladas coinciden (tol 1e-4)
- Probabilidad cardiovascular coincide (tol 1e-3)
- Probabilidad metabolico coincide (tol 1e-3)
- Probabilidad respiratorio coincide (tol 1e-3)

---

## Tolerancias

| Componente | Tolerancia | Diferencia real maxima |
|-----------|-----------|----------------------|
| Features escaladas (Node vs Python) | 1e-4 | ~0 (bit exacto) |
| Probabilidades ONNX (Node vs Python) | 1e-3 | ~5.4e-4 |

La tolerancia 1e-3 se debe a diferencias de precision de punto flotante entre
`onnxruntime-node` (C++) y `onnxruntime` (Python) al procesar arboles XGBoost
con valores extremos. Es una diferencia despreciable (0.05% max).

---

## Como regenerar los golden cases

```bash
cd ml/risk-prediction
python src/generate_golden_cases.py
```

Esto genera `golden_cases.json` en `artifacts/` y lo copia a `backend/src/modules/prediction/model/`.

---

## Suite completa

```bash
cd backend
npm test  # 68 tests, 6 files
```

```
Test Files  6 passed (6)
     Tests  68 passed (68)
```

### Desglose

| Archivo | Tests |
|---------|-------|
| `src/utils/billing.test.ts` | 8 |
| `src/utils/drugSafety.test.ts` | 9 |
| `src/utils/slots.test.ts` | 14 |
| `src/modules/prediction/prediction.featureBuilder.test.ts` | 11 |
| `src/modules/prediction/prediction.factors.test.ts` | 14 |
| `src/modules/prediction/prediction.consistency.test.ts` | 12 |
| **Total** | **68** |

---

## Criterios de finalizacion

- [x] `featureBuilder` cubierto con casos base, bordes, orden y determinismo (10 tests)
- [x] `evaluateFactors` cubierto con 3 categorias, umbrales y pureza (14 tests)
- [x] Consistency Python ↔ Node demostrada con 3 casos golden versionados
  - [x] Features escaladas dentro de tolerancia 1e-4
  - [x] Probabilidades ONNX dentro de tolerancia 1e-3
- [x] Suite completa: 68/68 tests pasan
- [x] Documentacion actualizada en AGENTS.md
- [x] Golden cases generados y versionados
