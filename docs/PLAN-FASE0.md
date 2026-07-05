# Fase 0 — Predicción de Riesgo Clínico con IA

## Propósito

Definir el alcance inicial del módulo de predicción de riesgo clínico antes de generar datos sintéticos, entrenar modelos o integrar inferencia en la aplicación.

La funcionalidad estimará riesgos clínicos orientativos a partir del historial registrado del paciente. Su objetivo es apoyar la revisión médica con alertas tempranas, no emitir diagnósticos automáticos.

## Alcance del MVP

- **Usuario principal:** médico.
- **Usuarios con acceso previsto:** médico y administrador.
- **Ubicación futura en UI:** vista de historia clínica del paciente.
- **Horizonte de predicción:** `proxima_visita`.
- **Tipo de resultado:** probabilidad por categoría clínica, nivel de riesgo y factores explicativos.
- **Naturaleza del proyecto:** académico, con entrenamiento sobre datos sintéticos.

## Exclusiones

- No se agregará edad, sexo ni fecha de nacimiento al modelo de paciente.
- No se usarán datos reales de pacientes para entrenamiento.
- No se presentará como diagnóstico médico oficial.
- No reemplazará el criterio del profesional de salud.
- No se expondrá inicialmente al paciente.

## Categorías Clínicas Iniciales

| Categoría | Descripción | Señales disponibles |
|-----------|-------------|---------------------|
| `cardiovascular` | Riesgo orientativo asociado a presión arterial y estado cardiocirculatorio. | Presión sistólica, presión diastólica, frecuencia cardíaca, diagnósticos/motivos relacionados. |
| `metabolico` | Riesgo orientativo asociado a glucosa, peso e indicadores corporales disponibles. | Glucosa, peso, talla, IMC derivado si hay peso y talla, diagnósticos/motivos relacionados. |
| `respiratorio` | Riesgo orientativo asociado a oxigenación y cuadros respiratorios recurrentes. | Saturación O2, temperatura, frecuencia de consultas respiratorias, diagnósticos/motivos relacionados. |

## Niveles de Riesgo

| Nivel | Rango de probabilidad | Uso visual sugerido |
|-------|------------------------|--------------------|
| `bajo` | `< 0.35` | Verde |
| `medio` | `>= 0.35` y `< 0.70` | Ámbar |
| `alto` | `>= 0.70` | Rojo |

Los umbrales son iniciales y están pensados para un MVP académico. Podrán ajustarse tras evaluar el modelo con datos sintéticos.

## Variables Permitidas

El módulo solo podrá usar información ya disponible en el sistema:

- Signos vitales: peso, talla, presión sistólica, presión diastólica, frecuencia cardíaca, temperatura, glucosa y saturación O2.
- Trayectoria clínica: cantidad de consultas, días desde la última consulta, intervalo promedio entre consultas y cantidad de consultas con signos vitales.
- Tendencias: último valor, promedio, máximo, mínimo y cambio reciente de signos vitales relevantes.
- Texto/códigos clínicos: diagnóstico, motivo, notas y CIE-10 mediante reglas simples o palabras clave controladas.
- Variables derivadas: IMC si existen peso y talla.

## Criterios de Datos Insuficientes

En fases posteriores, el módulo deberá tratar como historial insuficiente los casos donde:

- El paciente no tenga consultas registradas.
- No existan signos vitales suficientes para construir señales numéricas útiles.
- El historial tenga únicamente texto clínico sin variables estructuradas.

La respuesta no debe fallar; debe devolver una salida controlada indicando que no hay información suficiente para una estimación confiable.

## Explicabilidad

Los factores explicativos iniciales serán interpretables y trazables. Para el MVP se priorizarán explicaciones basadas en reglas o contribuciones simples, por ejemplo:

- "Presión sistólica elevada en consultas recientes".
- "Glucosa máxima por encima del rango esperado".
- "Saturación O2 baja registrada en el historial".
- "Consultas frecuentes con motivo respiratorio".

SHAP u otras técnicas avanzadas podrán evaluarse después, pero no son requisito del MVP porque la inferencia en Node mediante ONNX no entrega explicaciones SHAP directamente.

## Disclaimer

Texto base que debe acompañar los resultados:

> Esta predicción es una estimación académica generada a partir del historial registrado del paciente. No constituye un diagnóstico médico, no reemplaza el criterio profesional y debe utilizarse únicamente como apoyo orientativo para la revisión clínica.

## Entregables de Fase 0

- Documento de alcance y exclusiones del módulo.
- Categorías clínicas iniciales y señales asociadas.
- Umbrales de nivel de riesgo.
- Contrato conceptual de salida.
- Primera versión del esquema de features compartido por entrenamiento e inferencia.

## Criterios de Aceptación

- No se requiere agregar nuevos campos demográficos al paciente.
- Las categorías clínicas están cerradas para el MVP.
- Los niveles de riesgo tienen umbrales definidos.
- El disclaimer está definido.
- Existe un esquema de features versionable para mantener consistencia entre Python y Node.
