# Plan Fase 1 — Dataset Sintético para Predicción de Riesgo Clínico

## Resumen
- Generar un dataset sintético académico basado en historiales médicos simulados de 6 meses.
- Usar exclusivamente las 21 features definidas en `D:\Codigo\Proyectos\sistema-medico\ml\risk-prediction\feature-schema.json`.
- Usar los 4 tipos de cita y las 33 especialidades como contexto generativo, no como columnas del modelo.
- Producir dos salidas: `CSV` para entrenamiento y `JSONL` para auditoría/trazabilidad de historiales sintéticos.

## Cambios Clave
- Crear un generador reproducible en `D:\Codigo\Proyectos\sistema-medico\ml\risk-prediction`.
- Leer `feature-schema.json` como fuente de verdad para nombres de columnas, categorías, keywords y umbrales.
- Simular 5000 pacientes sintéticos, cada uno con historial de hasta 6 meses.
- Generar consultas sintéticas con fecha, tipo de cita, especialidad, signos vitales, motivo, diagnóstico, notas y keywords clínicas.
- Transformar cada historial sintético a una fila tabular con las 21 features existentes.
- Generar labels/probabilidades sintéticas para `cardiovascular`, `metabolico` y `respiratorio` mediante reglas clínicas orientativas.

## Diseño del Dataset
- Salida principal: `synthetic-risk-dataset.csv`, con una fila por paciente sintético.
- Salida de auditoría: `synthetic-medical-histories.jsonl`, con los historiales simulados usados para construir cada fila.
- Columnas del CSV:
  - Las 21 features de `feature-schema.json`.
  - Labels/probabilidades objetivo: `target_cardiovascular`, `target_metabolico`, `target_respiratorio`.
  - Niveles derivados: `nivel_cardiovascular`, `nivel_metabolico`, `nivel_respiratorio`.
- Las especialidades influirán en la generación:
  - Cardiología y Medicina Interna elevan probabilidad de señales cardiovasculares.
  - Endocrinología y Nutrición elevan probabilidad de señales metabólicas.
  - Neumología y Urgencias elevan probabilidad de señales respiratorias.
  - Otras especialidades generan historiales neutros o mixtos.
- Los tipos de cita influirán en frecuencia y contenido:
  - `Consulta general`: mezcla amplia de signos y motivos.
  - `Control`: seguimiento de condiciones previas.
  - `Procedimiento`: menos peso predictivo clínico general.
  - `Psicologia`: no se usará para elevar directamente riesgos físico-clínicos del MVP.

## Reglas de Generación
- Mantener valores clínicos plausibles para presión, frecuencia cardíaca, glucosa, IMC, saturación O2 y temperatura.
- Introducir variabilidad controlada: pacientes sanos, riesgo bajo, medio y alto.
- Permitir datos faltantes realistas usando `null` en features numéricas cuando aplique.
- Usar `0` en conteos de keywords cuando no existan coincidencias.
- No usar edad, sexo, fecha de nacimiento ni datos reales de pacientes.
- Mantener una semilla fija para que el dataset sea regenerable.

## Validación
- Verificar que el CSV contiene exactamente las features esperadas del schema.
- Verificar que todas las probabilidades están entre `0` y `1`.
- Verificar que los niveles respetan los umbrales: bajo `< 0.35`, medio `>= 0.35` y `< 0.70`, alto `>= 0.70`.
- Verificar que existe diversidad de casos en las tres categorías.
- Verificar que el JSONL permite rastrear de qué historial sintético salió cada fila.
- Documentar reglas, supuestos, tamaño del dataset y comando de regeneración.

## Supuestos Confirmados
- Tamaño inicial: 5000 pacientes sintéticos.
- Salidas: CSV para entrenamiento y JSONL para auditoría.
- Las especialidades y tipos de cita se usan solo como contexto generativo.
- La Fase 1 no entrena modelos, no integra backend y no modifica la UI.
- La Fase 1 prepara la base para Fase 2, donde recién se entrenará fuera de la app.
