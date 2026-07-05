# Demo Seed, Repo Cleanup y Commits por Fase

## Contexto

El proyecto ya tiene implementadas las fases 0-6 del módulo de predicción clínica y un `backend/src/scripts/seed.ts` básico de demostración. El siguiente paso es convertir ese seed en un generador coherente de una clínica con 6 meses de operación simulada, y después dejar el repositorio limpio y organizado para versionar el trabajo de machine learning por fases.

La solicitud combina tres frentes distintos:

1. Seed clínico completo para demo.
2. Limpieza e higiene del repositorio antes de commitear.
3. Agrupación de cambios existentes en commits temáticos y push final.

Por riesgo y dependencias, el trabajo se abordará en ese orden lógico, pero el primer subproyecto a diseñar e implementar es el seed clínico.

## Objetivo

Construir un seed de demo re-ejecutable que cree médicos, pacientes, citas históricas, historiales clínicos, recetas y facturas coherentes con el módulo de predicción, sin tocar datos ajenos al propio seed, y luego usar ese resultado para limpiar el repo y ordenar el historial de commits por fase.

## Decisiones Aprobadas

- El seed debe soportar re-ejecución con limpieza selectiva de sus propios datos.
- El primer perfil verificable será pequeño, pensado para local/staging.
- Se permite que el seed ejecute efectos colaterales reales de servicios existentes, incluidas notificaciones y logs de correo.
- Se prioriza reutilizar servicios y validaciones existentes sobre inserciones directas.

## Alcance del Seed

El seed debe generar un ecosistema clínico consistente a lo largo de los últimos 6 meses.

Debe incluir:

- Cuentas de médicos con `medicoProfile`, especialidad y horario funcional.
- Cuentas de pacientes con datos verosímiles.
- Citas históricas asignadas a médicos de la especialidad adecuada según el perfil clínico del paciente.
- `medicalRecord` por cita atendida con signos vitales coherentes y trayectoria temporal.
- `prescription` por consulta, válida respecto a alergias e interacciones.
- `invoice` por cita, con una política configurable de facturas pagadas.

No debe incluir:

- Nuevos campos persistentes en esquemas de dominio solo para soportar el seed.
- Inserciones masivas que salten invariantes críticos de agenda, facturación o seguridad farmacológica.
- Limpieza destructiva de datos ajenos al universo generado por el seed.

## Arquitectura Propuesta

El seed seguirá viviendo en `backend/src/scripts/seed.ts`, pero se convertirá en un orquestador por fases internas. No hace falta crear un sistema separado mientras la lógica quede segmentada en funciones pequeñas y testeables.

Fases internas propuestas:

1. `cleanupSeedData`
2. `seedCatalogos`
3. `seedActores`
4. `seedAgendaHistorica`
5. `seedHistoriaClinica`
6. `emitSummary`

Cada fase recibe un contexto en memoria con las entidades creadas para evitar recomputar búsquedas y para mantener trazabilidad durante la corrida.

## Estrategia de Identificación y Limpieza

La limpieza debe borrar solo el universo generado por el seed anterior. Como no se quiere introducir un campo técnico extra en cada documento, la identificación se basará en marcadores controlados presentes en datos que el seed domina.

Marcadores previstos:

- Emails con patrón exclusivo, por ejemplo `seed.demo+...`.
- Números de documento con prefijo `SEED-`.
- Números de colegiatura con prefijo `SEED-`.
- Motivos o notas con prefijo `[seed-demo]` cuando sea útil enlazar registros secundarios.

Orden de limpieza:

1. Facturas del universo seed.
2. Recetas asociadas a historiales seed.
3. Historiales clínicos del universo seed.
4. Citas del universo seed.
5. Perfiles médicos seed.
6. Usuarios seed.

La limpieza debe ejecutarse antes de sembrar para garantizar idempotencia práctica durante ajuste local y staging.

## Reutilización de Servicios Existentes

Se priorizará reutilizar servicios existentes en este orden:

- `patient.service.create` para alta de pacientes.
- `medico.service.createMedico` para alta de médicos.
- `medico.service.updateHorario` para asignar horarios válidos.
- `appointment.service.reservar` para crear citas respetando agenda y validaciones reales.
- `record.service.createRecord` para registrar consultas clínicas.
- `prescription.service.emitir` para validar alergias e interacciones.
- `invoice.service.crear` y `invoice.service.marcarPagada` cuando aplique.

Uso directo de modelos solo será aceptable donde hoy no exista un servicio razonable y siempre que no se rompan invariantes del dominio.

## Generación de Médicos

Se generará un conjunto pequeño por defecto, parametrizable, con distribución amplia sobre las especialidades existentes. El objetivo no es cubrir las 33 especialidades de forma uniforme, sino poblar la mayoría con variedad suficiente para la demo.

Reglas:

- Datos verosímiles generados con `@faker-js/faker`.
- Emails únicos y estables dentro del prefijo del seed.
- Password común o parametrizable para facilitar demo.
- Colegiaturas únicas con prefijo seed.
- Horarios construidos con franjas compatibles con `updateHorarioSchema`.
- `duracionSlotMin` alineada con las franjas para que `computeSlots` produzca disponibilidad válida.

El seed debe apoyarse en la misma lógica del sistema para que luego la UI de disponibilidad funcione sin excepciones especiales.

## Generación de Pacientes

Los pacientes también se crearán con datos realistas y únicos.

Datos mínimos:

- Nombre y apellido.
- Email único.
- Documento válido y único.
- Teléfono.
- Alergias plausibles.

Además, cada paciente recibirá en memoria un perfil interno de riesgo por categoría:

- `cardiovascular: alto|medio|bajo`
- `metabolico: alto|medio|bajo`
- `respiratorio: alto|medio|bajo`

Ese perfil no se persistirá. Solo servirá como guía para generar historia clínica y seleccionar especialidad predominante.

## Mapeo Riesgo a Especialidad

Cada paciente tendrá una narrativa clínica principal para que sus citas no parezcan arbitrarias.

Mapeo base:

- Riesgo cardiovascular dominante: cardiología o medicina interna.
- Riesgo metabólico dominante: endocrinología, medicina interna o nutrición.
- Riesgo respiratorio dominante: neumología o medicina general.
- Riesgo global bajo: medicina general preventiva.

Este mapeo debe ser configurable en tablas simples dentro del seed para poder ajustarlo sin tocar la lógica principal.

## Generación de Citas Históricas

Las citas se distribuirán en los últimos 6 meses, nunca en fechas arbitrarias fuera del horario médico.

Principios:

- Se calculan fechas candidatas a partir de horarios reales del médico.
- Se respetan franjas, duración de slot y grilla de turnos.
- Se evita generar solapes imposibles.
- Se usa un volumen de citas por paciente dependiente del riesgo.

Volumen inicial orientativo:

- Riesgo alto: 4-6 consultas.
- Riesgo medio: 3-4 consultas.
- Riesgo bajo: 2-3 consultas.

Flujo previsto:

1. Construir candidatos de fecha válidos usando `slots.ts`.
2. Reservar la cita con `appointment.service.reservar` para pasar por reglas reales.
3. Mover la cita a estado histórico atendido para reflejar que ya ocurrió.

El objetivo es que el historial quede coherente con la agenda real del sistema, no solo con la base de datos.

## Generación de Historiales Clínicos

Cada cita atendida genera un `medicalRecord`.

La lógica clínica debe inspirarse en las mismas reglas de la Fase 1 del dataset sintético: los signos vitales no serán aleatorios puros, sino series temporales coherentes con el nivel de riesgo.

Ejemplos de trayectoria:

- Riesgo cardiovascular alto: presión elevada persistente o ligeramente creciente, mayor frecuencia cardíaca, posible aumento de IMC.
- Riesgo metabólico alto: glucosa e IMC alterados y sostenidos.
- Riesgo respiratorio alto: saturación menor y más síntomas respiratorios.
- Riesgo bajo: estabilidad dentro de rangos normales.

La meta es que el módulo de predicción entregue resultados convincentes y consistentes con lo que el usuario ve en el historial.

## Generación de Recetas

Cada consulta atendida debe parecer completa y cerrar el flujo clínico.

Por eso, cada historial clínico generará una receta basada en catálogos simples por especialidad o problema.

Reglas:

- Los medicamentos deben ser plausibles para la especialidad.
- Antes de persistir, se validan con `prescription.service.emitir`.
- Si una combinación dispara alergias o interacciones, el seed debe elegir otra combinación segura en vez de forzar confirmaciones artificiales para la demo.

Esto asegura que la demo muestre el comportamiento válido del sistema, no el manejo excepcional.

## Generación de Facturas

Cada cita atendida también debe producir su factura asociada.

Reglas:

- La factura se genera a partir de la cita, usando la lógica existente.
- Un porcentaje configurable se marca como pagado para que la demo muestre variedad.
- El resto puede quedar pendiente solo como deuda de caja posterior a una consulta ya realizada, en una proporción baja y consistente.

La política exacta de pagos debe ser sencilla y parametrizable.

## Parámetros del Seed

El script debe exponer una configuración clara, aunque internamente lea variables de entorno o constantes editables.

Parámetros mínimos:

- cantidad de médicos
- cantidad de pacientes
- ventana histórica en meses
- perfil de escala inicial pequeño
- proporción de facturas pagadas
- password demo por defecto

El primer perfil verificado será pequeño para iterar rápido en local/staging.

## Estrategia de Tests

Como el repositorio actual prioriza pruebas unitarias sin Mongo real, no se intentará cubrir el script completo con pruebas de integración pesadas.

Sí se deben crear pruebas unitarias para piezas puras extraídas del seed, por ejemplo:

- asignación de especialidad dominante según riesgo
- generador de trayectoria de signos vitales
- selección de fechas históricas válidas
- selección de medicamentos seguros

La implementación debe seguir TDD: primero test que falla, luego código mínimo.

## Verificación Manual del Seed

Antes de escalar o usar Atlas de producción, el seed debe validarse en local o staging con el perfil pequeño.

Criterios de validación:

- El seed corre sin duplicar su propio universo.
- La agenda muestra citas consistentes con horarios médicos.
- El historial del paciente muestra evolución clínica razonable.
- Las recetas e invoices aparecen correctamente ligadas a las citas.
- Las predicciones de pacientes altos, medios y bajos son coherentes con la historia generada.

## Limpieza del Repositorio

La limpieza del repositorio se divide en dos momentos para evitar ruido y riesgos innecesarios.

Primera pasada, antes de implementar el seed:

- asegurar que `.gitignore` excluya datasets, notebooks, outputs pesados y secretos accidentales
- confirmar que los artefactos runtime de predicción no estén siendo ignorados por error
- retirar archivos claramente temporales o peligrosos para no arrastrarlos durante el desarrollo

Segunda pasada, después de validar el seed:

- borrar tests temporales u obsoletos que no formen parte de la Fase 6 útil
- verificar el conjunto final exacto de archivos listos para commit

Esto incluye:

- confirmar que datasets pesados, notebooks y outputs de entrenamiento estén ignorados
- confirmar que los artefactos runtime del backend sí queden versionados
- revisar que no haya secretos o archivos accidentales listos para commit

`.gitignore` deberá actualizarse para reflejar exactamente esa política.

## Política de Versionado de ML

Debe quedar explícito que:

- sí se versionan `backend/src/modules/prediction/model/*.onnx`
- sí se versiona `backend/src/modules/prediction/model/model-metadata.json`
- no se versionan datasets sintéticos CSV/JSONL ni artefactos de exploración pesada si no son necesarios en runtime

El estado final esperado se validará con `git status` y `git diff --stat`.

## Estrategia de Commits por Fase

Los cambios acumulados se reagruparán en commits temáticos con staging selectivo. No se plantea reescritura compleja de historial previa, sino construcción ordenada de commits desde el estado actual del worktree.

Orden objetivo:

1. Fase 0 — alcance y esquema.
2. Fase 1 — generación de datos sintéticos.
3. Fase 2 — entrenamiento.
4. Fase 3 — exportación ONNX.
5. Fase 4 — backend prediction.
6. Fase 5 — frontend.
7. Fase 6 — tests.
8. Limpieza y seed demo.
9. Docs.

Cada commit debe revisarse por archivos exactos antes de crearse.

## Orden de Ejecución

El orden aprobado para el trabajo es:

1. Limpieza del repo y política de ignorados.
2. Implementación y validación del seed con perfil pequeño.
3. Agrupación de commits por fase.
4. Push a `main`.
5. Corrida conservadora del seed en Atlas de producción y escalado posterior.

## Riesgos y Mitigaciones

Riesgo: el seed use modelos directos y deje datos inconsistentes.
Mitigación: priorizar servicios existentes y encapsular cualquier acceso directo residual.

Riesgo: la selección aleatoria produzca predicciones incoherentes.
Mitigación: usar trayectorias deterministas o pseudoaleatorias guiadas por perfil de riesgo.

Riesgo: limpiar de más y tocar datos externos.
Mitigación: usar marcadores exclusivos del seed y borrar en orden restringido.

Riesgo: subir archivos pesados o secretos junto con el trabajo de ML.
Mitigación: revisar `.gitignore`, `git status` y `git diff --stat` antes de commitear.

## Resultado Esperado

Al finalizar, el proyecto tendrá:

- un seed clínico completo, coherente y re-ejecutable
- una demo convincente para el módulo de predicción
- el repositorio limpio respecto a artefactos no deseados
- un historial de commits legible y alineado con las fases del proyecto
