# Funcionalidad que se quiere añadir

### Qué función quiero añadir
Incorporar un módulo de predicción de riesgo clínico con IA a nuestro sistema de consultorio médico. En pocas palabras: una funcionalidad que, a partir del historial de consultas de un paciente, estime la probabilidad de que desarrolle ciertas categorías de problemas de salud (cardiovascular, metabólica, respiratoria, etc.) y le muestre esa información al médico como apoyo a su decisión.

No es un diagnóstico automático ni reemplaza al médico. Es una herramienta de ayuda que le da al doctor una "alerta temprana" basada en los datos que ya guardamos.

### Cómo funcionaría
- El médico abre el historial de un paciente en su panel.
- El sistema toma las consultas previas de ese paciente (signos vitales, edad, frecuencia de visitas, condiciones anteriores).
Un modelo de machine learning analiza esa trayectoria y devuelve una probabilidad de riesgo por categoría.
- El panel del médico muestra el resultado con barras de color por nivel (bajo/medio/alto), junto a los factores que explican la predicción y un aviso de que es solo una sugerencia.

### Por qué quiero implementarlo
- Valor agregado / diferenciación: la mayoría de los sistemas de gestión médica solo agendan citas y guardan historiales. Añadir IA predictiva nos distingue de un EHR común y demuestra un nivel técnico superior.
- Aprovecha datos que ya tenemos: nuestro modelo medicalRecord ya almacena signos vitales e historial. No hay que recolectar nada nuevo; le damos un uso inteligente a la información existente.
- Apoyo real al flujo de trabajo del médico: le ayuda a anticipar qué podría presentar un paciente recurrente antes de que regrese, para llegar mejor preparado a la consulta.
- Encaja sin romper el sistema: se integra como un módulo nuevo y aprovecha nuestro stack actual (la inferencia corre en el mismo backend de Node), sin añadir servicios externos complejos.

### Qué NO es (para evitar malentendidos)
- No es un diagnóstico médico oficial ni de uso clínico real.
- No sustituye el criterio del médico
- Es un proyecto académico, y los datos para entrenar el modelo serán sintéticos (generados con reglas realistas), no datos de pacientes reales.


## Plan de implementacion para esta funcionalidad


- **Fase 0**: definir categorías, horizonte y feature_schema.json.
- **Fase 1**: generar dataset sintético desde reglas realistas usando las mismas columnas del schema.
- **Fase 2**: entrenar fuera de la app, pero versionar scripts/model metrics en una carpeta ml/.
- **Fase 3**: exportar ONNX y guardar también metadata: labels, thresholds, scaler/schema.
- **Fase 4**: implementar backend/src/modules/prediction con carga única del modelo.
- **Fase 5**: integrar tarjeta en historial médico, no visible para paciente salvo que quieras permitirlo.
- **Fase 6**: tests de featureBuilder, autorización Médico/Admin y consistencia Python vs Node.