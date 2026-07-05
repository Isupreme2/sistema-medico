# Sistema de Gestión de Consultorios Médicos (EHR)

Sistema para agendar citas, gestionar historia clínica y emitir recetas digitales, con un modelo de roles cercano a una clínica real: **Director/Administrador · Recepción · Médico · Paciente**.

> 🌐 **Desplegado en producción:** Frontend en **Vercel**, backend en **Render**, base de datos en **MongoDB Atlas**. Ver [Despliegue](#despliegue-en-producción).

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + **Express** + TypeScript (arquitectura en capas) |
| Base de datos | **MongoDB Atlas** + Mongoose |
| Frontend | **Angular 22** (standalone components + signals) |
| Auth | JWT (access + refresh httpOnly) + RBAC + 2FA (TOTP) |
| Tiempo real | **Socket.io** (disponibilidad de slots + notificaciones in-app) |
| Recetas | **PDFKit** (PDF en streaming) + QR de verificación |
| Recordatorios | **node-cron** + **nodemailer** (modo *log* sin SMTP) |
| Teleconsulta | **Jitsi Meet** embebido (sin servidor de medios propio) |
| IA clínica | Fase 0 documentada para predicción académica de riesgo clínico |
| Docs | Swagger / OpenAPI en `/docs` |

## Estructura

```
sistema-medico/
├── docs/             Documentación de alcance y decisiones de diseño
├── ml/               Contratos de features/salida para modelos predictivos
├── backend/          API Express + TypeScript (arquitectura en capas)
│   ├── src/
│   │   ├── config/       env (Zod), db (con fallback DNS), cors (dinámico), swagger
│   │   ├── constants/    roles (admin · recepcionista · medico · paciente)
│   │   ├── middleware/   authenticate, authorize, validate, audit, error
│   │   ├── models/       user, medicoProfile, appointmentType, bloqueo,
│   │   │                 appointment, medicalRecord, prescription,
│   │   │                 notification, preConsulta, invoice, auditLog
│   │   ├── modules/      auth · medico · staff (cuentas de Recepción) ·
│   │   │                 specialty · appointmentType · appointment
│   │   │                 (incl. teleconsulta/preconsulta) · patient · record ·
│   │   │                 prescription · notification · invoice · analytics · audit
│   │   ├── jobs/         reminders (node-cron)
│   │   ├── realtime/     socket.io (slots + notificaciones)
│   │   ├── routes/       índice de rutas + /health
│   │   ├── scripts/      seed
│   │   ├── utils/        jwt, AppError, asyncHandler, logger, slots,
│   │   │                 drugSafety, billing, mailer
│   │   ├── app.ts        ensamblado de Express
│   │   └── server.ts     bootstrap (DB + sockets + cron + shutdown)
│   ├── .env.example
│   └── package.json
└── frontend/         Angular 22 (standalone + signals)
    └── src/app/
        ├── core/         services, interceptors (token+refresh), guards,
        │                 models, layout (shell + campana de notificaciones)
        ├── features/     auth · dashboard · admin · recepcion · medico ·
        │                 paciente · facturacion · historial · preconsulta ·
        │                 teleconsulta
        ├── shared/       line-chart / bar-chart (chart.js)
        ├── app.config.ts proveedores (HttpClient + interceptor)
        └── app.routes.ts rutas con lazy loading y guards
```

## Puesta en marcha (backend)

```bash
cd backend
cp .env.example .env      # y completa MONGODB_URI + secretos JWT
npm install
npm run dev               # arranca en http://localhost:4000
npm run seed              # crea cuentas demo (ver abajo)
```

| Script | Acción |
|--------|--------|
| `npm run dev` | Servidor con recarga (tsx watch) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta el build de producción |
| `npm run typecheck` | Chequeo de tipos sin emitir |
| `npm run seed` | Universo clínico demo re-ejecutable para predicción y vistas históricas |
| `npm test` | Batería de pruebas (Vitest) |

## Puesta en marcha (frontend)

```bash
cd frontend
npm install
npm start                 # ng serve → http://localhost:4200
```

> El backend debe estar corriendo en `:4000`. El login, registro y dashboard
> por rol ya están conectados a la API (JWT + refresh por cookie httpOnly).

### Cuentas demo (tras `npm run seed`)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Director / Admin | `admin@ehr.dev` | `Admin1234` |
| Recepción | `recepcion@ehr.dev` | `Recepcion1234` |

Además, el seed crea un universo clínico de demostración con 10 médicos y 48 pacientes (por defecto), cada uno con 6 meses de citas atendidas, historias clínicas, recetas y facturas coherentes con el módulo de predicción.

**Médicos generados (10 por defecto):**

| # | Email | Contraseña | Especialidad |
|---|-------|-----------|-------------|
| 1 | `seed.demo+doctor.1@ehr.dev` | `SeedDemo1234` | Medicina General |
| 2 | `seed.demo+doctor.2@ehr.dev` | `SeedDemo1234` | Medicina Interna |
| 3 | `seed.demo+doctor.3@ehr.dev` | `SeedDemo1234` | Cardiología |
| 4 | `seed.demo+doctor.4@ehr.dev` | `SeedDemo1234` | Endocrinología |
| 5 | `seed.demo+doctor.5@ehr.dev` | `SeedDemo1234` | Neumología |
| 6 | `seed.demo+doctor.6@ehr.dev` | `SeedDemo1234` | Nutrición |
| 7 | `seed.demo+doctor.7@ehr.dev` | `SeedDemo1234` | Pediatría |
| 8 | `seed.demo+doctor.8@ehr.dev` | `SeedDemo1234` | Dermatología |
| 9 | `seed.demo+doctor.9@ehr.dev` | `SeedDemo1234` | Ginecología y Obstetricia |
| 10 | `seed.demo+doctor.10@ehr.dev` | `SeedDemo1234` | Neurología |

**Pacientes generados (48 por defecto):**

| # | Email | Contraseña | Perfil de riesgo |
|---|-------|-----------|-----------------|
| 1 | `seed.demo+patient.0@ehr.dev` | `SeedDemo1234` | alto (cardiovascular + metabólico + respiratorio) |
| 2 | `seed.demo+patient.1@ehr.dev` | `SeedDemo1234` | medio (metabólico) |
| 3 | `seed.demo+patient.2@ehr.dev` | `SeedDemo1234` | medio (respiratorio) |
| 4 | `seed.demo+patient.3@ehr.dev` | `SeedDemo1234` | alto (cardiovascular + metabólico + respiratorio) |
| 5 | `seed.demo+patient.4@ehr.dev` | `SeedDemo1234` | medio (metabólico) |
| 6 | `seed.demo+patient.5@ehr.dev` | `SeedDemo1234` | medio (respiratorio) |
| 7 | `seed.demo+patient.6@ehr.dev` | `SeedDemo1234` | alto (cardiovascular + metabólico + respiratorio) |
| 8 | `seed.demo+patient.7@ehr.dev` | `SeedDemo1234` | medio (metabólico) |
| 9 | `seed.demo+patient.8@ehr.dev` | `SeedDemo1234` | medio (respiratorio) |
| 10 | `seed.demo+patient.9@ehr.dev` | `SeedDemo1234` | alto (cardiovascular + metabólico + respiratorio) |
| 11 | `seed.demo+patient.10@ehr.dev` | `SeedDemo1234` | medio (metabólico) |
| 12 | `seed.demo+patient.11@ehr.dev` | `SeedDemo1234` | medio (respiratorio) |
| … | … | … | … |
| 48 | `seed.demo+patient.47@ehr.dev` | `SeedDemo1234` | medio (respiratorio) |

El patrón se repite cada 3 pacientes: índice `% 3 === 0` → riesgo alto en las 3 categorías, `% 3 === 1` → riesgo medio metabólico, `% 3 === 2` → riesgo medio respiratorio. La contraseña común se parametriza vía `SEED_PASSWORD`, la cantidad de médicos con `SEED_DOCTORS` y la de pacientes con `SEED_PATIENTS`.

> El seed es **re-ejecutable**: primero limpia solo su propio universo (`seed.demo+...`) y luego lo regenera. No toca datos ajenos a ese namespace. Los parámetros se ajustan vía variables de entorno: `SEED_DOCTORS` (10), `SEED_PATIENTS` (48), `SEED_MONTHS_BACK` (6), `SEED_PAID_RATIO` (0.85) y `SEED_PASSWORD` (SeedDemo1234).

### Política de artefactos ML

- Sí se versionan los artefactos runtime del backend en `backend/src/modules/prediction/model/`, incluyendo `*.onnx` y `model-metadata.json`.
- No se versionan el dataset sintético CSV/JSONL, `.venv`, `__pycache__` ni archivos locales temporales de soporte.

## API (estado actual)

Documentación interactiva: **http://localhost:4000/docs**

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/v1/health` | Público | Healthcheck |
| POST | `/api/v1/auth/register` | Público | Registro de paciente |
| POST | `/api/v1/auth/login` | Público | Login (access token + cookie refresh) |
| POST | `/api/v1/auth/refresh` | Cookie | Renueva access token |
| POST | `/api/v1/auth/logout` | Auth | Cierra sesión (invalida refresh) |
| GET | `/api/v1/auth/me` | Auth | Perfil actual |
| POST | `/api/v1/auth/2fa/setup` | Auth | Inicia 2FA (devuelve QR) |
| POST | `/api/v1/auth/2fa/enable` | Auth | Activa 2FA con código TOTP |
| GET | `/api/v1/medicos` | Auth | Lista de médicos |
| POST | `/api/v1/medicos` | Admin | Crear médico (usuario + perfil) |
| GET | `/api/v1/medicos/:id` | Auth | Detalle de un médico |
| PATCH | `/api/v1/medicos/:id` | Admin | Actualizar credenciales (especialidad, colegiatura, estado) |
| PUT | `/api/v1/medicos/:id/horario` | **Admin** | Definir horarios y duración de slot (lo fija la Dirección) |
| GET/POST | `/api/v1/medicos/:id/bloqueos` | Auth / **Admin** | Listar (auth) / crear bloqueos (Admin) |
| DELETE | `/api/v1/medicos/:id/bloqueos/:bloqueoId` | Admin | Eliminar bloqueo |
| GET/POST | `/api/v1/staff` | Admin | Cuentas de Recepción / Registrador (listar / crear) |
| GET | `/api/v1/especialidades` | Auth | Catálogo de especialidades (selector) |
| GET | `/api/v1/especialidades/publicas` | **Público** | Especialidades con médico activo (sitio web) |
| GET | `/api/v1/appointment-types` | Auth | Lista de tipos de cita |
| POST/PATCH/DELETE | `/api/v1/appointment-types/:id?` | Admin | Gestionar tipos de cita |
| GET | `/api/v1/appointments/disponibilidad/:id?fecha=` | Auth | Slots disponibles de un médico |
| GET | `/api/v1/appointments` | Auth | Citas (filtradas por rol) |
| POST | `/api/v1/appointments/reservar-y-pagar` | Paciente | Reserva atómica + factura pagada (pago al confirmar; **motivo obligatorio**) |
| POST | `/api/v1/appointments` | Recepción/Admin | Agendar a nombre del paciente (cobro en caja vía Facturar; **motivo obligatorio**) |
| PATCH | `/api/v1/appointments/:id/cancel` | Dueño/Médico/Recepción/Admin | Cancelar (libera slot) |
| PATCH | `/api/v1/appointments/:id/status` | Médico | Marcar atendida/no-asistió |
| GET | `/api/v1/patients?q=` | Recepción/Médico/Admin | Buscar pacientes por nombre/email |
| POST | `/api/v1/patients` | Recepción/Admin | Registrar un paciente |
| POST | `/api/v1/records` | Médico | Crear consulta clínica (con signos vitales) |
| GET | `/api/v1/records/paciente/:id` | Médico/Dueño/Admin | Historial clínico de un paciente |
| GET | `/api/v1/records/:id` | Médico/Dueño/Admin | Detalle de una consulta |
| PATCH | `/api/v1/auth/me` | Auth | Actualizar datos propios (teléfono, alergias) |
| POST | `/api/v1/prescriptions` | Médico | Emitir receta (alerta de alergias/interacciones; opcional `historialId` → la vincula a la consulta) |
| GET | `/api/v1/prescriptions/paciente/:id` | Médico/Dueño/Admin | Recetas de un paciente |
| GET | `/api/v1/prescriptions/:id/pdf` | Médico/Dueño/Admin | Descargar receta en PDF |
| GET | `/api/v1/prescriptions/verify/:codigo` | **Público** | Verificar autenticidad (QR) |
| GET | `/api/v1/notifications` | Auth | Mis notificaciones + contador no leídas |
| GET | `/api/v1/notifications/unread-count` | Auth | Cantidad de no leídas |
| PATCH | `/api/v1/notifications/read-all` | Auth | Marcar todas como leídas |
| PATCH | `/api/v1/notifications/:id/read` | Auth | Marcar una como leída |
| GET | `/api/v1/appointments/:id/video` | Participante | Datos de la sala de teleconsulta (+ventana horaria) |
| GET | `/api/v1/appointments/:id/preconsulta` | Médico/Dueño/Admin | Ver formulario de pre-consulta |
| POST | `/api/v1/appointments/:id/preconsulta` | Paciente dueño | Enviar/actualizar pre-consulta |
| GET/POST | `/api/v1/invoices` | Auth / Recepción-Admin | Listar (por rol) / emitir factura |
| GET | `/api/v1/invoices/:id/pdf` | Dueño/Recepción/Admin | Descargar factura en PDF |
| PATCH | `/api/v1/invoices/:id/pay` | Recepción/Admin | Registrar cobro (marcar pagada) |
| PATCH | `/api/v1/invoices/:id/refund` | Recepción/Admin | Reembolsar una factura pagada |
| POST | `/api/v1/invoices/reembolsar-cita/:citaId` | Paciente | Solicitar reembolso de una cita vencida |
| PATCH | `/api/v1/invoices/:id/void` | Admin | Anular factura |
| GET | `/api/v1/analytics/overview` | Admin | Métricas (citas, ausentismo, ingresos, top médicos) |
| GET | `/api/v1/audit` | Admin | Bitácora de auditoría (paginada, filtrable) |

## Despliegue en producción

Arquitectura partida: cada pieza en la plataforma donde rinde mejor.

```
[Vercel] frontend Angular (estático)  ──HTTPS──▶  [Render] backend Express (proceso persistente)
                                                          │
                                                          ▼
                                                  [MongoDB Atlas]
```

- **Frontend → Vercel.** Root Directory `frontend`. Config en `frontend/vercel.json`
  (output `dist/frontend/browser` + *rewrite* SPA). La URL del backend se inyecta en
  `index.html` vía `window.__API_URL__`, **solo** fuera de local/Codespaces.
- **Backend → Render** (Web Service). Root Directory `backend`. Build Command
  `npm ci --include=dev && npm run build`, Start `npm run start`. Node fijado a 22
  con `.node-version`. Se eligió Render (no Vercel) porque el backend necesita un
  **proceso vivo** para Socket.io y el cron de recordatorios, imposible en *serverless*.
- **Base de datos → Atlas.** El *Network Access* debe permitir `0.0.0.0/0` (Render usa
  IPs de salida dinámicas).

**Variables de entorno en Render:** `NODE_ENV=production`, `MONGODB_URI`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`,
`CORS_ORIGIN`/`FRONTEND_URL` = URL de Vercel, `PUBLIC_URL` = URL de Render,
`DNS_SERVERS=8.8.8.8,1.1.1.1`. **No** definir `PORT` (Render lo inyecta).

> La **resolución de la URL del API en runtime** y el **CORS dinámico** permiten que el
> *mismo build* funcione en local, GitHub Codespaces y producción sin recompilar. La
> cookie de sesión usa `SameSite=None; Secure` para sobrevivir entre dominios distintos
> (Vercel ↔ Render).

## Roadmap

- [x] **Fase 0** — Setup + arquitectura en capas + hardening + Swagger
- [x] **Fase 1** — Auth (JWT + refresh) + RBAC + 2FA
- [x] **Fase 2** — Médicos, horarios, bloqueos y tipos de cita
- [x] **Fase 3** — Agenda atómica (índice único parcial) + calendario en tiempo real *(lista de espera pendiente como extra)*
- [x] **Fase 4** — Historia clínica + signos vitales + CIE-10 + gráficas *(adjuntos de archivos pendientes como extra)*
- [x] **Fase 5** — Recetas + PDF + QR + alerta de alergias/interacciones
- [x] **Fase 6** — Recordatorios email (node-cron) + notificaciones in-app en tiempo real
- [x] **Fase 7** — Teleconsulta por video (Jitsi embebido) + formulario de pre-consulta
- [x] **Fase 8** — Panel analítico + facturación básica + visor de auditoría
- [x] **Fase 9** — Factura en PDF (PDFKit) + seed de demostración enriquecido e idempotente + módulo de facturación con pruebas
- [x] **Rol Recepción / Director** — modelo de roles de clínica real: Recepción agenda por el paciente, lo registra y cobra; Admin = Director
- [x] **Despliegue en producción** — Vercel (frontend) + Render (backend) + Atlas, con URL del API y CORS resueltos en runtime
- [x] **Realismo de roles** — la Dirección define los horarios de cada médico (el médico solo los consulta), el médico no factura (el cobro es de Recepción/Admin), el Admin crea cuentas de Recepción, pago al reservar (pay-to-confirm) y el sitio público solo anuncia especialidades con médico activo
- [x] **Coherencia clínica** — Plan/Indicaciones separado de la Receta (vinculada a su consulta por `historialId`) y motivo de consulta obligatorio al reservar, con pre-consulta opcional ofrecida tras agendar
- [x] **IA clínica Fase 0** — Alcance, categorías, umbrales, disclaimer y contratos iniciales para predicción académica de riesgo clínico
- [ ] **Futuro** — PWA, i18n (ES/EN), modo oscuro, Docker, adjuntos a la historia clínica, lista de espera, entrenamiento ML e inferencia ONNX

## Decisiones de diseño destacadas

- **Reserva atómica anti doble-cita.** El arbitraje lo hace la base de datos vía
  un índice único *parcial* `{medicoId, fechaHora}` filtrado por `estado: 'reservada'`.
  Se intenta `create()` y se captura el error 11000 → `409`; al cancelar, el slot
  se libera solo. Sin chequeo previo: no hay condición de carrera.
- **Teleconsulta sin servidor de medios propio.** Se usa **Jitsi Meet embebido**.
  El backend solo genera una sala única e impredecible por cita y valida participante
  + ventana horaria (la sala se habilita 10 min antes y se cierra 30 min después).
  Cero infraestructura de video que mantener.
- **Tiempo real con salas dirigidas.** Socket.io usa salas `medico:{id}` (cambios de
  disponibilidad) y `user:{id}` (notificaciones), evitando *broadcasts* globales.
- **Recordatorios tolerantes a fallos.** El job de `node-cron` y el envío de correo
  nunca tumban el flujo de negocio; sin SMTP configurado, el mailer cae a modo *log*.
- **Seguridad farmacológica.** Al emitir una receta se cruzan los medicamentos contra
  las alergias del paciente e interacciones conocidas (`422` con alertas; el médico
  debe confirmar para emitir igual).
- **Integridad de receta.** Cada receta lleva un hash SHA-256; el endpoint público de
  verificación lo recalcula para confirmar que no fue alterada.
- **Auditoría automática.** Un middleware registra toda acción que modifica datos
  (POST/PATCH/PUT/DELETE) con usuario, ruta y estado HTTP, sin tocar cada handler.
- **Métricas en la base, no en memoria.** El panel analítico se calcula con *aggregation
  pipelines* de MongoDB (citas por estado, ausentismo, ingresos, top médicos).
- **Roles cercanos a una clínica real.** La **Dirección** (Admin) define los horarios de
  cada médico y crea las cuentas de **Recepción**; el médico se concentra en lo clínico
  (no fija su agenda ni cobra) y el cobro vive en Recepción/Admin. El sitio público solo
  anuncia especialidades que tengan **al menos un médico activo** asignado.
- **Plan / Indicaciones ≠ Receta.** El campo **Plan / Indicaciones** de la consulta (texto
  libre: reposo, dieta, exámenes, controles) se separa de la **receta**, que lleva los
  medicamentos estructurados con alerta de alergias, QR y PDF. La receta queda **vinculada a
  su consulta** vía `historialId`; en el historial, cada consulta muestra sus recetas.
- **Motivo obligatorio al reservar.** Toda reserva (paciente y Recepción/Admin) exige un
  **motivo de consulta**. La **pre-consulta** detallada (síntomas, dolor 0–10, medicación)
  es **opcional** y se ofrece *después* de agendar — no antes, porque la pre-consulta cuelga
  de la cita (relación 1:1 con `citaId`).

## Seguridad

- Contraseñas con **bcrypt** (12 rounds), nunca expuestas en respuestas.
- **Helmet**, rate limiting, **CORS dinámico** por entorno, sanitización anti NoSQL-injection.
- Cookie de *refresh* `httpOnly` con `SameSite`/`Secure` configurables (soporte cross-domain).
- **Socket.io autenticado por token**: la sala de notificaciones se deriva del JWT verificado, no del id del cliente.
- Bloqueo temporal de cuenta tras 5 intentos fallidos.
- Validación de entrada con **Zod** en cada endpoint.
- Secretos en `.env` (excluido del control de versiones).

## Auditoría de calidad y seguridad

Terminadas las funcionalidades se auditó el código y se corrigieron **9 hallazgos** por causa raíz (re-verificando tests + build AOT tras cada cambio):

**Seguridad**
- Socket.io autenticado por token: la sala `user:{id}` se deriva del JWT verificado, no del id que envíe el cliente → un usuario no puede recibir las notificaciones de otro.

**Robustez del API**
- Mensajes de validación **específicos** (primer error de Zod), no un genérico "Error de validación".
- IDs con formato inválido → **400** en vez de 500 (manejo de `CastError`).
- No se permite **facturar dos veces** la misma cita, ni una cita **cancelada o no atendida**.

**Experiencia de uso (frontend)**
- Fecha inicial del calendario en **hora local** (no UTC).
- Errores de cancelación **visibles** (ya no fallan en silencio).
- Búsqueda de pacientes con **debounce** + `switchMap` (sin una petición por tecla ni resultados fuera de orden).
- Al cancelar Recepción/Admin se notifica a **médico y paciente**.
