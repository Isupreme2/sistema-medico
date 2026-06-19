# Sistema de Gestión de Consultorios Médicos (EHR)

Sistema para agendar citas, gestionar historia clínica y emitir recetas digitales, con roles **Administrador / Médico / Paciente**.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + **Express** + TypeScript (arquitectura en capas) |
| Base de datos | **MongoDB Atlas** + Mongoose |
| Frontend | **Angular 20** (standalone components + signals) |
| Auth | JWT (access + refresh httpOnly) + RBAC + 2FA (TOTP) |
| Docs | Swagger / OpenAPI en `/docs` |

## Estructura

```
sistema-medico/
├── backend/          API Express + TypeScript
│   ├── src/
│   │   ├── config/       env (validado con Zod), db, swagger
│   │   ├── constants/    roles
│   │   ├── middleware/   authenticate, authorize, validate, error
│   │   ├── models/       user.model
│   │   ├── modules/      auth (routes → controller → service → validation)
│   │   ├── routes/       índice de rutas + /health
│   │   ├── scripts/      seed
│   │   ├── utils/        jwt, AppError, asyncHandler, logger
│   │   ├── app.ts        ensamblado de Express
│   │   └── server.ts     bootstrap (DB + listen + shutdown)
│   ├── .env.example
│   └── package.json
└── frontend/         Angular 20 (standalone + signals)
    └── src/app/
        ├── core/         services (auth), interceptors (token+refresh), guards (auth/role), models
        ├── features/     auth (login, register), dashboard (landing por rol)
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
| `npm run seed` | Cuentas demo de los 3 roles |

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
| Admin | `admin@ehr.dev` | `Admin1234` |
| Médico | `medico@ehr.dev` | `Medico1234` |
| Paciente | `paciente@ehr.dev` | `Paciente1234` |

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
| PATCH | `/api/v1/medicos/:id` | Admin/Médico | Actualizar perfil |
| PUT | `/api/v1/medicos/:id/horario` | Admin/Médico | Definir horarios y duración de slot |
| GET/POST | `/api/v1/medicos/:id/bloqueos` | Auth/Médico | Listar/crear bloqueos |
| DELETE | `/api/v1/medicos/:id/bloqueos/:bloqueoId` | Admin/Médico | Eliminar bloqueo |
| GET | `/api/v1/appointment-types` | Auth | Lista de tipos de cita |
| POST/PATCH/DELETE | `/api/v1/appointment-types/:id?` | Admin | Gestionar tipos de cita |
| GET | `/api/v1/appointments/disponibilidad/:id?fecha=` | Auth | Slots disponibles de un médico |
| GET | `/api/v1/appointments` | Auth | Citas (filtradas por rol) |
| POST | `/api/v1/appointments` | Paciente | Reservar cita (atómica) |
| PATCH | `/api/v1/appointments/:id/cancel` | Dueño/Médico/Admin | Cancelar (libera slot) |
| PATCH | `/api/v1/appointments/:id/status` | Médico | Marcar atendida/no-asistió |
| POST | `/api/v1/records` | Médico | Crear consulta clínica (con signos vitales) |
| GET | `/api/v1/records/paciente/:id` | Médico/Dueño/Admin | Historial clínico de un paciente |
| GET | `/api/v1/records/:id` | Médico/Dueño/Admin | Detalle de una consulta |

## Roadmap

- [x] **Fase 0** — Setup + arquitectura en capas + hardening + Swagger
- [x] **Fase 1** — Auth (JWT + refresh) + RBAC + 2FA
- [x] **Fase 2** — Médicos, horarios, bloqueos y tipos de cita
- [ ] **Fase 3** — Agenda atómica + calendario en tiempo real + lista de espera
- [x] **Fase 4** — Historia clínica + signos vitales + CIE-10 + gráficas *(adjuntos de archivos pendientes como extra)*
- [ ] **Fase 5** — Recetas + PDF + QR + alerta de alergias/interacciones
- [ ] **Fase 6** — Recordatorios email + notificaciones + portal del paciente
- [ ] **Fase 7** — Teleconsulta (video) + formulario pre-consulta
- [ ] **Fase 8** — Dashboard analítico + facturación + auditoría
- [ ] **Fase 9** — PWA + i18n + modo oscuro + tests + Docker

## Seguridad

- Contraseñas con **bcrypt** (12 rounds), nunca expuestas en respuestas.
- **Helmet**, rate limiting, CORS estricto, sanitización anti NoSQL-injection.
- Bloqueo temporal de cuenta tras 5 intentos fallidos.
- Validación de entrada con **Zod** en cada endpoint.
- Secretos en `.env` (excluido del control de versiones).
