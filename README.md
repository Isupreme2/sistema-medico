# Sistema de Gestión de Consultorios Médicos (EHR)

Sistema para agendar citas, gestionar historia clínica y emitir recetas digitales, con roles **Administrador / Médico / Paciente**.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + **Express** + TypeScript (arquitectura en capas) |
| Base de datos | **MongoDB Atlas** + Mongoose |
| Frontend | **Angular** (standalone components + signals) — *próximamente* |
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
└── frontend/         Angular (próximamente)
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

## Roadmap

- [x] **Fase 0** — Setup + arquitectura en capas + hardening + Swagger
- [x] **Fase 1** — Auth (JWT + refresh) + RBAC + 2FA
- [ ] **Fase 2** — Médicos, horarios, bloqueos y tipos de cita
- [ ] **Fase 3** — Agenda atómica + calendario en tiempo real + lista de espera
- [ ] **Fase 4** — Historia clínica + signos vitales + adjuntos + CIE-10
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
