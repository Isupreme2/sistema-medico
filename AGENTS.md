# AGENTS.md — Sistema de Gestión de Consultorios Médicos (EHR)

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js (>=20) + Express + TypeScript (arquitectura en capas) |
| Base de datos | MongoDB Atlas + Mongoose |
| Frontend | Angular 22 (standalone components + signals) |
| Auth | JWT (access + refresh httpOnly) + RBAC + 2FA (TOTP) |
| Tiempo real | Socket.io |
| PDFs | PDFKit + QR |
| Recordatorios | node-cron + nodemailer (modo *log* si no hay SMTP) |
| Teleconsulta | Jitsi Meet embebido |
| Tests backend | Vitest |
| Tests frontend | Karma + Jasmine |

## Comandos principales

### Backend (`cd backend`)
- `npm run dev` — servidor con hot-reload via `tsx watch` en `:4000`
- `npm run build` — compila TypeScript a `dist/`
- `npm start` — ejecuta el build de producción
- `npm run typecheck` — `tsc --noEmit` (sin emitir archivos)
- `npm run lint` — ESLint sobre `src/**/*.ts`
- `npm test` — Vitest (batería completa)
- `npm run seed` — seed clínico re-ejecutable con médicos, pacientes, 6 meses de historia y datos coherentes para predicción (ver README)
- Orden recomendado: `lint -> typecheck -> test`

### Frontend (`cd frontend`)
- `npm start` — `ng serve` en `:4200`
- `npm run build` — build Angular
- `npm test` — Karma/Jasmine

## Arquitectura del backend

```
src/
├── config/       env (Zod validation), db (Mongoose + DNS fallback), cors (dinámico), swagger
├── constants/    roles.ts, especialidades.ts
├── middleware/   authenticate (JWT), authorize (RBAC), validate (Zod), audit, error
├── models/       Mongoose schemas: user, medicoProfile, appointment, medicalRecord, etc.
├── modules/      auth · medico · appointmentType · appointment · patient · record ·
│                 prescription · notification · invoice · analytics · audit
├── jobs/         reminders (node-cron)
├── realtime/     socket.io
├── routes/       index.ts monta todos los módulos bajo `/api/v1`
├── utils/        jwt, AppError, asyncHandler, logger, slots, drugSafety, billing, mailer
├── app.ts        ensamblado Express
└── server.ts     bootstrap (DB + sockets + cron + graceful shutdown)
```

Cada módulo sigue el patrón: `*.routes.ts` → `*.controller.ts` → `*.service.ts` (+ `*.validation.ts` con Zod).

## Convenciones y detalles importantes

- **Reserva atómica anti doble-cita**: La BD arbitra vía índice único parcial `{medicoId, fechaHora}` con filtro `estado: 'reservada'`. Se captura error 11000 → 409. Sin chequeo previo — no hay condición de carrera.
- **CORS dinámico**: `config/cors.ts` resuelve el origen permitido según entorno (usa `CORS_ORIGIN` de env, o el header `Origin` en producción).
- **API URL runtime**: El frontend resuelve `apiUrl` en tiempo de ejecución (`environment.ts`). Soporta localhost, Codespaces, y override via `window.__API_URL__` para Vercel/Render.
- **Refresh token**: Cookie httpOnly (`SameSite` configurable, `Secure` en prod). Logout global incrementa `versionToken` en el usuario.
- **Auditoría automática**: Middleware que registra POST/PATCH/PUT/DELETE con usuario, ruta y status.
- **Seguridad farmacológica**: Al emitir receta se cruzan alergias del paciente e interacciones conocidas. Responde `422` con alertas; el médico debe confirmar.
- **Hash en recetas**: Cada receta tiene SHA-256; endpoint público `/prescriptions/verify/:codigo` lo recalcula para verificar integridad.
- **Teleconsulta**: Sala Jitsi única e impredecible. Ventana: 10 min antes - 30 min después de la cita. Validación por participante.
- **Slots horarios**: La clínica usa UTC-5. `utils/slots.ts` contiene la lógica de cómputo de slots, bloqueos y franjas.
- **Mailer**: Sin SMTP configurado, `utils/mailer.ts` imprime los correos en consola en lugar de enviarlos.
- **Seed clínico re-ejecutable**: Limpia solo su propio namespace (`seed.demo+...`) y regenera médicos, pacientes, citas atendidas, historiales, recetas y facturas. Parámetros principales: `SEED_DOCTORS`, `SEED_PATIENTS`, `SEED_MONTHS_BACK`, `SEED_PAID_RATIO`, `SEED_PASSWORD`.

## Roles del sistema

`admin` (Director) · `recepcionista` · `medico` · `paciente`

- Recepción agenda por el paciente, registra pacientes nuevos y cobra.
- Admin (Director) tiene acceso completo.
- Médico ve su agenda, emite recetas, crea consultas.

## Pruebas

- Backend: Vitest. Tests junto al source (`*.test.ts`). No requieren DB — son unitarios.
  - Suite actual: **83 tests** (utils + prediction + seed generators).
- Frontend: Karma + Jasmine. Test specs junto a componentes (`*.spec.ts`).
- No hay tests de integración ni e2e aún.

## Despliegue en producción

- Frontend → **Vercel** (static). Config en `frontend/vercel.json`. Root `frontend`, output `dist/frontend/browser`, rewrite SPA.
- Backend → **Render** Web Service. Root `backend`. Build: `npm ci --include=dev && npm run build`. Start: `npm start`. Node 22 (`.node-version`). No definir `PORT`.
- DB → **MongoDB Atlas**. Network Access permite `0.0.0.0/0` (Render IPs dinámicas).
- Cookie `SameSite=None; Secure` para cross-domain (Vercel ↔ Render).
- DNS de respaldo: `DNS_SERVERS=8.8.8.8,1.1.1.1` si Atlas SRV falla.

## Módulo ML (predicción de riesgo clínico)

- Fase 0: contratos en `ml/risk-prediction/` (`feature-schema.json`, `output-contract.json`)
- **Fase 1 (completada)**: dataset sintético generado (`ml/risk-prediction/generar_dataset.py`).
  - 5000 pacientes, historial de 6 meses, 21 features del schema + 6 columnas target.
  - Salidas: `synthetic-risk-dataset.csv` (entrenamiento) y `synthetic-medical-histories.jsonl` (auditoría).
  - Regenerable con semilla fija: `cd ml/risk-prediction && python generar_dataset.py`
  - Usa las 33 especialidades y 4 tipos de cita como contexto generativo.
  - Labels sintéticos mediante reglas clínicas orientativas (cardiovascular, metabólico, respiratorio).
  - Validación automática inline (features, rangos [0,1], diversidad de niveles, trazabilidad JSONL).
- **Fase 2 (completada)**: entrenamiento y evaluación de 3 clasificadores XGBoost (uno por categoría).
  - Pipeline completo en `ml/risk-prediction/src/`: carga, preprocesado (mediana + StandardScaler),
    entrenamiento (GridSearchCV + stratified 70/15/15), evaluación (AUC, precisión, recall, F1, matriz de confusión) y SHAP.
  - Artifacts versionados en `artifacts/`: modelos `.joblib`, `preprocessor_params.json`, `model_metadata.json`,
    SHAP top features.
  - Reproducible con semilla fija 42: `cd ml/risk-prediction && pip install -r requirements.txt && python run_pipeline.py`
  - SHAP confirma que aprendió las reglas clínicas (keywords, presión → cardiovascular; glucosa, IMC → metabólico; satO2 → respiratorio).
- **Fase 3 (completada)**: exportación a ONNX + metadata completa para Node.js.
  - Script `ml/risk-prediction/src/export_onnx.py`: conversión XGBoost → ONNX vía `onnxmltools` (opset 15),
    verificación de paridad Python ↔ ONNX (tolerancia 1e-4, diff real ~1e-7),
    generación de `model-metadata.json` con `feature_order`, `preprocessing`, `thresholds`, `models`, `output_spec`.
  - Artefactos: 3 `.onnx` (~75 KB, ~43 KB, ~42 KB) + `model-metadata.json`.
  - Copia automática a `backend/src/modules/prediction/model/` con `index.ts` tipado.
  - Contingencia documentada para XGBoost 2.1.3 si onnxmltools no soporta 3.x.
  - Reproducible: `cd ml/risk-prediction && python src/export_onnx.py`
- **Fase 4 (completada)**: módulo `prediction` en backend Express + TypeScript.
  - `PredictionEngine` singleton (carga 3 ONNX en bootstrap, fail-fast si falta asset).
  - `buildFeatures()`: 21 features desde `IMedicalRecord[]`, imputación con mediana + StandardScaler,
    retorna `null` si < 2 consultas o < 1 con signos vitales.
  - `evaluateFactors()`: 12 reglas clínicas distribuidas en 3 categorías.
  - `prediction.service`: orquestador (historial → features → inferencia → factores → respuesta).
  - Rutas `GET /predictions/paciente/:id` protegidas con `authenticate` + `authorize(MEDICO, ADMIN)`.
  - Documentación Swagger OpenAPI 3.0.3.
  - Dependencia: `onnxruntime-node@1.27.0`
- **Fase 5 (completada)**: UI de predicción en frontend Angular.
  - Modelo `prediction.model.ts` y servicio `prediction.service.ts` (Observable puro).
  - Componente standalone `RiskPredictionCard` en `shared/` con 5 estados (idle/loading/éxito/datos_insuficientes/error).
  - Carga bajo demanda con botón "Analizar riesgo".
  - Factores visibles solo cuando nivel ≥ "medio".
  - Integrado en `features/historial/` entre gráficas y lista de consultas, visible solo para médico/admin.
- **Fase 6 (completada)**: tests automatizados y validación de consistencia.
  - `prediction.featureBuilder.test.ts`: 11 tests (base + bordes + orden + determinismo).
  - `prediction.factors.test.ts`: 14 tests (3 categorías, umbrales, pureza).
  - `prediction.consistency.test.ts`: 12 tests (3 casos golden × 4 assertions c/u).
    - Features escaladas: tolerancia 1e-4.
    - Probabilidades ONNX Python ↔ Node: tolerancia 1e-3 (diff real ~5e-4).
  - Suite total: **68 tests** (6 archivos) — todos pasan.
  - Golden cases generados por `ml/risk-prediction/src/generate_golden_cases.py`.
  - Tol: 1e-3 (paridad ONNX), 1e-4 (preprocesado features).
