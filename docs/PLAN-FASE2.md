
# 🧬 Fase 2: Entrenamiento, Evaluación y Versionado del Modelo

## 🎯 Objetivo de la Fase 2
Entrenar, fuera de la aplicación, un modelo de predicción de riesgo por categoría clínica, evaluarlo con rigor, y dejar todo versionado (*scripts* + métricas) para que sea **reproducible y defendible**. 

Al terminar, debes tener un modelo entrenado listo para exportar a ONNX en la Fase 3 — *pero la exportación no es parte de esta fase, aquí solo entrenas y validas*.

---

## 🛠️ Pasos de Ejecución

### Paso 1 — Preparar el entorno y la estructura de `ml/`
Organiza la carpeta para que sea reproducible. La estructura recomendada es la siguiente:

```bash
ml/risk-prediction/
├── feature-schema.json        # Ya lo tienes de Fase 0
├── data/
│   ├── synthetic-risk-dataset.csv
│   └── synthetic-medical-histories.jsonl
├── src/
│   ├── load_data.py           # Carga + validación contra schema
│   ├── build_features.py      # Construcción del vector de features
│   ├── train.py               # Entrenamiento
│   └── evaluate.py            # Métricas y gráficos
├── artifacts/                 # Modelo entrenado + metadata (salida)
├── metrics/                   # Reportes de evaluación versionados
├── requirements.txt           # Versiones fijadas
└── README.md                  # Cómo reproducir
```

> **Acción crítica:** Fija las versiones de las librerías en `requirements.txt` (`pandas`, `numpy`, `scikit-learn`, `xgboost`/`lightgbm`, `shap`) y **fija una semilla aleatoria (`random_state`)** en todo el pipeline. Esto es lo que hace que el entrenamiento sea reproducible — crítico para defenderlo académicamente.

### Paso 2 — Cargar y validar los datos contra el schema
Antes de entrenar, valida que el CSV cumple el contrato de la Fase 0:

* **Carga** el CSV con `pandas`.
* **Verifica** que estén exactamente las **21 features** del `feature-schema.json`, con los tipos correctos.
* **Separa** columnas: las 21 features de entrada vs. las columnas de etiqueta (las categorías de riesgo objetivo).
* **Comprueba** valores nulos, rangos fuera de lo esperado y cardinalidad de categóricas.
* **Revisa** el balance de clases (cuántos ejemplos hay de riesgo alto/medio/bajo por categoría). Esto define decisiones más adelante.

*Este paso es tu red de seguridad: si el schema y los datos no coinciden aquí, fallarán también en la inferencia en Node.*

### Paso 3 — Congelar la lógica de construcción de features
Este es el paso más importante de toda la integración. La forma en que transformas los datos crudos en el vector de features debe ser **idéntica en Python (ahora) y en Node (Fase 4)**.

* Implementa `build_features.py` como la **única fuente de verdad** de esa transformación.
* **Documenta** cada paso: orden de las columnas, codificación de categóricas (*one-hot* / *ordinal*), escalado de numéricas, manejo de faltantes.
* **Guarda** todos los parámetros del preprocesado (categorías del encoder, medias/desviaciones del scaler, orden exacto de columnas). Estos parámetros serán parte de la metadata que exportas en Fase 3.

> 💡 **Consejo de Ingeniería:** Si usas escalado o encoding, prefiere transformaciones simples y deterministas, porque tendrás que reproducirlas a mano en TypeScript. Un *scaler* estándar (media/desviación) es fácil de replicar; transformaciones complejas no.

### Paso 4 — Dividir en entrenamiento / validación / prueba
* Divide en tres conjuntos (típico: **70/15/15**) con la semilla fija.
* Usa **partición estratificada** por la etiqueta para mantener el balance de clases en cada subconjunto.
* Si un mismo "paciente sintético" pudiera tener varias filas, asegúrate de que **no se filtre entre train y test** (agrupa por paciente al dividir). *Con tu formato de una fila por paciente esto no aplica, pero verifícalo.*

### Paso 5 — Entrenar el modelo
* Empieza con un **baseline simple** (regresión logística o un árbol poco profundo) para tener una referencia. Si tu modelo complejo no supera el baseline, algo está mal.
* Entrena el modelo principal con **XGBoost** o **LightGBM**.
* Como tienes varias categorías de riesgo, decide la estrategia: un modelo *multiclase*, o varios modelos *binarios* (uno por categoría). *Para una demo, un clasificador por categoría suele ser más claro de explicar y de mostrar.*
* Ajusta el desbalance de clases si lo detectaste en el Paso 2 (pesos de clase o parámetros como `scale_pos_weight`).
* Haz una **búsqueda de hiperparámetros ligera** (con validación cruzada sobre *train+val*).

### Paso 6 — Evaluar con rigor
Aquí generas los entregables de métricas que versionarás en `metrics/`:

* Evalúa sobre el **conjunto de prueba** (que no tocaste durante el entrenamiento).
* Reporta métricas apropiadas para clasificación con posible desbalance: **AUC-ROC, precisión, recall, F1 por clase, y la matriz de confusión**. *La exactitud (accuracy) sola no basta si hay desbalance.*
* Verifica que los umbrales de riesgo que definiste en Fase 0 (bajo/medio/alto) tienen sentido frente a las probabilidades reales del modelo; ajústalos si es necesario.
* Guarda gráficos (curva ROC, matriz de confusión) y un reporte de texto/JSON reproducible.

### Paso 7 — Explicabilidad con SHAP
Esto alimenta los "factores explicativos" que mostrarás en el panel del médico:

* Calcula valores **SHAP** sobre el conjunto de prueba.
* Verifica que los factores más influyentes coinciden con las reglas que usaste para generar los datos en Fase 1 *(ej. si generaste "presión alta → riesgo cardiovascular", SHAP debería reflejarlo)*. Esto es una validación doble excelente: confirma que el modelo aprendió lo correcto y no atajos espurios.
* Guarda los gráficos de importancia global para tu documentación.

### Paso 8 — Persistir el modelo y la metadata (preparación para Fase 3)
Sin exportar aún a ONNX, guarda en `artifacts/`:

1. **El modelo entrenado** en su formato nativo (para poder re-verificarlo).
2. **Un archivo de metadata** con: lista y orden de features, labels, umbrales, parámetros del scaler/encoder, versión del schema, semilla y métricas clave.

*Esta metadata es justo lo que necesitarás en Fase 3 y 4 para que Node reproduzca todo idénticamente.*

### Paso 9 — Documentar y versionar
* Escribe en el `README.md` de `ml/` cómo reproducir el entrenamiento paso a paso.
* Deja registrado el **número de versión del modelo**.

---

## ✅ Criterios para dar la Fase 2 por cerrada (Definition of Done)

- [ ] El modelo supera al baseline y las métricas por clase son razonables.
- [ ] SHAP confirma que aprendió las reglas esperadas.
- [ ] Todo el preprocesado está encapsulado y sus parámetros guardados.
- [ ] Entrenamiento reproducible con semilla fija.
- [ ] Métricas y metadata versionadas en `ml/`.

---

> ⚠️ **RECORDATORIO CLAVE (Conexión con Fases 3 y 4)**
> Guarda con obsesión el **orden exacto de las features** y los **parámetros del preprocesado**, porque toda la Fase 4 (inferencia en Node) depende de reproducirlos idénticamente. Es el error más común y el más difícil de depurar después en arquitecturas híbridas (Python ML + Node.js Backend).