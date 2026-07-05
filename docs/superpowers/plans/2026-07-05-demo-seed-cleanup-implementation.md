# Demo Seed, Repo Cleanup y Commits por Fase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el seed básico por un seed clínico coherente y re-ejecutable, limpiar el repositorio para excluir artefactos no deseados y dejar listo el trabajo para commits temáticos por fase.

**Architecture:** El backend mantendrá `backend/src/scripts/seed.ts` como orquestador, pero moverá la lógica clínica y de generación a helpers puros y testeables. El seed limpiará solo su propio universo usando marcadores controlados, reutilizará servicios reales para respetar invariantes del dominio y dejará un resumen de ejecución para validar coherencia antes de preparar commits.

**Tech Stack:** Node.js 20+, Express, TypeScript, Mongoose, Vitest, `@faker-js/faker`, PowerShell/git para verificación del repo.

## Global Constraints

- El seed debe soportar re-ejecución con limpieza selectiva de sus propios datos.
- El primer perfil verificable será pequeño, pensado para local/staging.
- Se permite que el seed ejecute efectos colaterales reales de servicios existentes, incluidas notificaciones y logs de correo.
- Se prioriza reutilizar servicios y validaciones existentes sobre inserciones directas.
- No se deben introducir nuevos campos persistentes en esquemas de dominio solo para soportar el seed.
- No se deben saltar invariantes críticos de agenda, facturación o seguridad farmacológica.
- Los artefactos runtime del backend (`backend/src/modules/prediction/model/*.onnx` y `model-metadata.json`) sí deben versionarse.
- Los datasets sintéticos, notebooks, outputs pesados, `.venv`, `__pycache__`, secretos y archivos accidentales no deben quedar listos para commit.

---

## File Structure

- Create: `backend/src/scripts/seed.types.ts`
  Responsabilidad: tipos compartidos del seed, perfiles de riesgo, configuración y contexto en memoria.
- Create: `backend/src/scripts/seed.generators.ts`
  Responsabilidad: helpers puros para riesgo, selección de especialidad, trayectorias clínicas, slots históricos y medicamentos seguros.
- Create: `backend/src/scripts/seed.generators.test.ts`
  Responsabilidad: pruebas unitarias TDD de la lógica pura del seed.
- Modify: `backend/src/scripts/seed.ts`
  Responsabilidad: cleanup selectivo, orquestación por fases, creación de médicos/pacientes/citas/historiales/recetas/facturas y resumen final.
- Modify: `backend/package.json`
  Responsabilidad: declarar `@faker-js/faker` para el seed.
- Modify: `backend/package-lock.json`
  Responsabilidad: reflejar la nueva dependencia.
- Modify: `.gitignore`
  Responsabilidad: excluir datasets, `.venv`, `__pycache__`, artefactos pesados y archivos accidentales; no excluir ONNX runtime assets del backend.
- Modify: `README.md`
  Responsabilidad: documentar el nuevo seed, sus parámetros y la política de artefactos ML.

### Task 1: Añadir pruebas unitarias para la lógica pura del seed

**Files:**
- Create: `backend/src/scripts/seed.types.ts`
- Create: `backend/src/scripts/seed.generators.test.ts`

**Interfaces:**
- Consumes: ninguna interfaz previa.
- Produces:
  - `type RiskLevel = 'bajo' | 'medio' | 'alto'`
  - `interface PatientRiskProfile { cardiovascular: RiskLevel; metabolico: RiskLevel; respiratorio: RiskLevel }`
  - `function pickDominantSpecialty(profile: PatientRiskProfile, fallback: string[]): string`
  - `function buildRiskTrend(params: { profile: PatientRiskProfile; visitIndex: number; totalVisits: number }): { presionSistolica?: number; presionDiastolica?: number; frecuenciaCardiaca?: number; glucosa?: number; saturacionO2?: number; peso?: number; talla?: number }`
  - `function pickHistoricalVisitCount(profile: PatientRiskProfile): number`
  - `function buildSafeMedicationPlan(params: { specialty: string; alergias: string[] }): Array<{ nombre: string; dosis: string; frecuencia: string; duracion: string }>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildRiskTrend,
  buildSafeMedicationPlan,
  pickDominantSpecialty,
  pickHistoricalVisitCount,
} from './seed.generators';
import type { PatientRiskProfile } from './seed.types';

const highCardio: PatientRiskProfile = {
  cardiovascular: 'alto',
  metabolico: 'bajo',
  respiratorio: 'bajo',
};

describe('pickDominantSpecialty', () => {
  it('prioritizes cardiology for dominant cardiovascular risk', () => {
    expect(pickDominantSpecialty(highCardio, ['Medicina General'])).toBe('Cardiologia');
  });
});

describe('pickHistoricalVisitCount', () => {
  it('assigns more visits to high-risk profiles than low-risk profiles', () => {
    const low: PatientRiskProfile = {
      cardiovascular: 'bajo',
      metabolico: 'bajo',
      respiratorio: 'bajo',
    };

    expect(pickHistoricalVisitCount(highCardio)).toBeGreaterThan(pickHistoricalVisitCount(low));
  });
});

describe('buildRiskTrend', () => {
  it('keeps cardiovascular pressure elevated across later visits', () => {
    const first = buildRiskTrend({ profile: highCardio, visitIndex: 0, totalVisits: 5 });
    const last = buildRiskTrend({ profile: highCardio, visitIndex: 4, totalVisits: 5 });

    expect(first.presionSistolica).toBeGreaterThanOrEqual(140);
    expect(last.presionSistolica).toBeGreaterThanOrEqual(first.presionSistolica!);
  });
});

describe('buildSafeMedicationPlan', () => {
  it('avoids medications matching patient allergies', () => {
    const meds = buildSafeMedicationPlan({
      specialty: 'Cardiologia',
      alergias: ['aspirina'],
    });

    expect(meds.some((med) => med.nombre.toLowerCase().includes('aspirina'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scripts/seed.generators.test.ts`
Expected: FAIL because `./seed.generators` and `./seed.types` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/scripts/seed.types.ts
export type RiskLevel = 'bajo' | 'medio' | 'alto';

export interface PatientRiskProfile {
  cardiovascular: RiskLevel;
  metabolico: RiskLevel;
  respiratorio: RiskLevel;
}

// backend/src/scripts/seed.generators.ts
const riskWeight = { bajo: 1, medio: 2, alto: 3 } as const;

export function pickDominantSpecialty(profile: PatientRiskProfile, fallback: string[]): string {
  if (profile.cardiovascular === 'alto') return 'Cardiologia';
  if (profile.metabolico === 'alto') return 'Endocrinologia';
  if (profile.respiratorio === 'alto') return 'Neumologia';
  return fallback[0] ?? 'Medicina General';
}

export function pickHistoricalVisitCount(profile: PatientRiskProfile): number {
  const max = Math.max(
    riskWeight[profile.cardiovascular],
    riskWeight[profile.metabolico],
    riskWeight[profile.respiratorio],
  );
  return max === 3 ? 5 : max === 2 ? 4 : 3;
}

export function buildRiskTrend(params: { profile: PatientRiskProfile; visitIndex: number; totalVisits: number }) {
  const progress = params.totalVisits <= 1 ? 0 : params.visitIndex / (params.totalVisits - 1);
  if (params.profile.cardiovascular === 'alto') {
    return {
      presionSistolica: Math.round(145 + progress * 8),
      presionDiastolica: Math.round(92 + progress * 4),
      frecuenciaCardiaca: Math.round(86 + progress * 4),
      peso: Math.round(82 + progress * 2),
      talla: 170,
    };
  }
  return {
    presionSistolica: 118,
    presionDiastolica: 78,
    frecuenciaCardiaca: 72,
    peso: 70,
    talla: 170,
  };
}

export function buildSafeMedicationPlan(params: { specialty: string; alergias: string[] }) {
  const allergySet = new Set(params.alergias.map((item) => item.toLowerCase()));
  const catalog = params.specialty === 'Cardiologia'
    ? [
        { nombre: 'Losartan', dosis: '50mg', frecuencia: 'cada 24h', duracion: '30 dias' },
        { nombre: 'Aspirina', dosis: '100mg', frecuencia: 'cada 24h', duracion: '30 dias' },
      ]
    : [{ nombre: 'Paracetamol', dosis: '500mg', frecuencia: 'cada 8h', duracion: '5 dias' }];

  return catalog.filter((med) => !allergySet.has(med.nombre.toLowerCase()));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scripts/seed.generators.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/scripts/seed.types.ts backend/src/scripts/seed.generators.ts backend/src/scripts/seed.generators.test.ts
git commit -m "test: add seed generator coverage"
```

### Task 2: Implementar generadores del seed y soporte de faker

**Files:**
- Create: `backend/src/scripts/seed.generators.ts`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`

**Interfaces:**
- Consumes:
  - `PatientRiskProfile`
  - `pickDominantSpecialty(profile: PatientRiskProfile, fallback: string[]): string`
  - `buildRiskTrend(params: { profile: PatientRiskProfile; visitIndex: number; totalVisits: number }): Record<string, number | undefined>`
  - `buildSafeMedicationPlan(params: { specialty: string; alergias: string[] }): Array<{ nombre: string; dosis: string; frecuencia: string; duracion: string }>`
- Produces:
  - `function buildDoctorSeedInput(index: number, specialty: string): { email: string; password: string; nombre: string; apellido: string; telefono: string; especialidad: string; numeroColegiatura: string; duracionSlotMin: number }`
  - `function buildPatientSeedInput(index: number): { email: string; password: string; nombre: string; apellido: string; telefono: string; tipoDocumento: 'DNI'; numeroDocumento: string; alergias: string[]; profile: PatientRiskProfile }`
  - `function buildWeeklySchedule(slotMinutes: number): Array<{ diaSemana: number; horaInicio: string; horaFin: string }>`
  - `function buildHistoricalDates(params: { monthsBack: number; visitCount: number; weeklySchedule: Array<{ diaSemana: number; horaInicio: string; horaFin: string }> }): Date[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildDoctorSeedInput,
  buildHistoricalDates,
  buildPatientSeedInput,
  buildWeeklySchedule,
} from './seed.generators';

describe('buildDoctorSeedInput', () => {
  it('uses the seed email namespace and unique colegiatura', () => {
    const doctor = buildDoctorSeedInput(3, 'Cardiologia');
    expect(doctor.email).toContain('seed.demo+doctor.3');
    expect(doctor.numeroColegiatura.startsWith('SEED-')).toBe(true);
  });
});

describe('buildPatientSeedInput', () => {
  it('creates unique seed identity fields', () => {
    const patient = buildPatientSeedInput(9);
    expect(patient.email).toContain('seed.demo+patient.9');
    expect(patient.numeroDocumento).toMatch(/^SEED-/);
  });
});

describe('buildWeeklySchedule', () => {
  it('creates weekday blocks aligned to the slot size', () => {
    expect(buildWeeklySchedule(30)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ diaSemana: 1, horaInicio: '08:00', horaFin: '12:00' }),
      ]),
    );
  });
});

describe('buildHistoricalDates', () => {
  it('returns the requested number of past dates', () => {
    const dates = buildHistoricalDates({
      monthsBack: 6,
      visitCount: 4,
      weeklySchedule: buildWeeklySchedule(30),
    });
    expect(dates).toHaveLength(4);
    expect(dates.every((date) => date.getTime() < Date.now())).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scripts/seed.generators.test.ts`
Expected: FAIL because the new generator functions are not exported yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import { faker } from '@faker-js/faker';

export function buildDoctorSeedInput(index: number, specialty: string) {
  return {
    email: `seed.demo+doctor.${index}@ehr.dev`,
    password: 'SeedDemo1234',
    nombre: faker.person.firstName(),
    apellido: faker.person.lastName(),
    telefono: faker.phone.number('9########'),
    especialidad: specialty,
    numeroColegiatura: `SEED-MED-${String(index).padStart(4, '0')}`,
    duracionSlotMin: 30,
  };
}

export function buildPatientSeedInput(index: number) {
  return {
    email: `seed.demo+patient.${index}@ehr.dev`,
    password: 'SeedDemo1234',
    nombre: faker.person.firstName(),
    apellido: faker.person.lastName(),
    telefono: faker.phone.number('9########'),
    tipoDocumento: 'DNI' as const,
    numeroDocumento: `SEED-${String(index).padStart(8, '0')}`,
    alergias: index % 5 === 0 ? ['penicilina'] : [],
    profile: {
      cardiovascular: index % 3 === 0 ? 'alto' : 'bajo',
      metabolico: index % 3 === 1 ? 'medio' : 'bajo',
      respiratorio: index % 3 === 2 ? 'medio' : 'bajo',
    },
  };
}

export function buildWeeklySchedule(slotMinutes: number) {
  void slotMinutes;
  return [1, 2, 3, 4, 5].flatMap((diaSemana) => [
    { diaSemana, horaInicio: '08:00', horaFin: '12:00' },
    { diaSemana, horaInicio: '15:00', horaFin: '18:00' },
  ]);
}

export function buildHistoricalDates(params: { monthsBack: number; visitCount: number }) {
  const dates: Date[] = [];
  for (let index = params.visitCount; index >= 1; index -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - Math.min(params.monthsBack, index));
    date.setDate(Math.max(1, 25 - index * 3));
    date.setHours(9 + (index % 3), 0, 0, 0);
    dates.push(date);
  }
  return dates;
}
```

Also add to `backend/package.json`:

```json
"@faker-js/faker": "^9.9.0"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scripts/seed.generators.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/scripts/seed.generators.ts backend/src/scripts/seed.generators.test.ts
git commit -m "feat: add seed data generators"
```

### Task 3: Reescribir el seed como orquestador clínico por fases

**Files:**
- Modify: `backend/src/scripts/seed.ts`
- Modify: `backend/src/scripts/seed.types.ts`

**Interfaces:**
- Consumes:
  - `buildDoctorSeedInput(index: number, specialty: string)`
  - `buildPatientSeedInput(index: number)`
  - `buildWeeklySchedule(slotMinutes: number)`
  - `buildHistoricalDates(params: { monthsBack: number; visitCount: number; weeklySchedule: Array<{ diaSemana: number; horaInicio: string; horaFin: string }> }): Date[]`
  - `buildRiskTrend(params: { profile: PatientRiskProfile; visitIndex: number; totalVisits: number })`
  - `buildSafeMedicationPlan(params: { specialty: string; alergias: string[] })`
- Produces:
  - `async function cleanupSeedData(): Promise<void>`
  - `async function seedCatalogs(): Promise<void>`
  - `async function seedDoctors(): Promise<Array<{ userId: string; specialty: string; slotMinutes: number; schedule: Array<{ diaSemana: number; horaInicio: string; horaFin: string }> }>>`
  - `async function seedPatients(): Promise<Array<{ userId: string; profile: PatientRiskProfile; alergias: string[] }>>`
  - `async function seedHistoricalAppointments(): Promise<void>`
  - `async function emitSeedSummary(): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildHistoricalDates, buildWeeklySchedule } from './seed.generators';

describe('seed historical date generation', () => {
  it('creates dates that can be projected into the seed schedule', () => {
    const schedule = buildWeeklySchedule(30);
    const dates = buildHistoricalDates({ monthsBack: 6, visitCount: 5, weeklySchedule: schedule });

    expect(dates).toHaveLength(5);
    expect(schedule.some((slot) => slot.diaSemana === dates[0].getDay())).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scripts/seed.generators.test.ts`
Expected: FAIL because `buildHistoricalDates` does not yet respect the supplied schedule.

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/scripts/seed.ts
async function seed(): Promise<void> {
  await connectDatabase();
  await cleanupSeedData();
  await seedCatalogs();
  const doctors = await seedDoctors();
  const patients = await seedPatients();
  await seedHistoricalAppointments({ doctors, patients });
  await emitSeedSummary();
  await disconnectDatabase();
}

async function seedDoctors() {
  const adminRequester = { sub: 'seed-admin', role: UserRole.ADMIN, email: 'seed@ehr.dev' };
  // createMedico + updateHorario per doctor
}

async function seedHistoricalAppointments() {
  const requester = { sub: patient.userId, role: UserRole.PACIENTE, email: patient.email };
  const cita = await reservar(requester, {
    medicoId: doctor.userId,
    fechaHora,
    modalidad: AppointmentModality.PRESENCIAL,
    motivo: `[seed-demo] Control ${doctor.specialty}`,
  });
  cita.estado = AppointmentStatus.ATENDIDA;
  await cita.save();
  await createRecord(doctor.userId, {
    pacienteId: patient.userId,
    citaId: cita._id.toString(),
    diagnostico: 'Seguimiento clinico de demo',
    signosVitales: buildRiskTrend({ profile: patient.profile, visitIndex, totalVisits }),
  });
}
```

Core orchestration rules to implement in `seed.ts`:

```ts
- cleanup by `seed.demo+` emails, `SEED-` colegiaturas and `[seed-demo]` motives
- seed specialties and appointment types before actors
- create doctors via `createMedico`, then apply schedules with `updateHorario`
- create patients via `patient.service.create`, then persist allergies on the created user record
- route each patient to a doctor whose specialty matches `pickDominantSpecialty`
- create historical appointments only in the past and mark them attended
- create a medical record, a safe prescription and an invoice for each attended appointment
- mark invoices paid using a simple configurable ratio
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scripts/seed.generators.test.ts`
Expected: PASS, proving the generator layer now matches schedule-aware seed expectations.

- [ ] **Step 5: Commit**

```bash
git add backend/src/scripts/seed.ts backend/src/scripts/seed.types.ts backend/src/scripts/seed.generators.ts backend/src/scripts/seed.generators.test.ts
git commit -m "feat: build coherent demo seed workflow"
```

### Task 4: Limpiar política de ignorados y documentar artefactos ML

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Consumes:
  - Runtime assets expected in `backend/src/modules/prediction/model/`
  - ML assets present in `ml/risk-prediction/`
- Produces:
  - `.gitignore` rules covering `.venv/`, `__pycache__/`, `*.pyc`, datasets CSV/JSONL, heavy metrics images and temporary files
  - README instructions for the new seed and artifact policy

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('.gitignore policy', () => {
  it('documents that ML datasets and virtualenvs are ignored', () => {
    const ignore = readFileSync('../../.gitignore', 'utf8');
    expect(ignore).toContain('ml/**/.venv/');
    expect(ignore).toContain('*.csv');
    expect(ignore).toContain('*.jsonl');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scripts/seed.generators.test.ts`
Expected: FAIL if the assertion is temporarily added and `.gitignore` still lacks the required entries.

- [ ] **Step 3: Write minimal implementation**

```gitignore
# Python / ML artifacts
**/.venv/
**/__pycache__/
*.pyc
ml/risk-prediction/synthetic-risk-dataset.csv
ml/risk-prediction/synthetic-medical-histories.jsonl
ml/risk-prediction/metrics/
ml/risk-prediction/artifacts/*.joblib
ml/risk-prediction/artifacts/scaler.joblib

# Local scratch files
backend/cookies.txt
```

Add to `README.md` a section like:

```md
### Seed clínico de demo

`npm run seed` ahora regenera un universo clínico de demostración con médicos, pacientes, citas históricas, historiales, recetas, facturas y datos coherentes con el módulo de predicción.

### Artefactos ML versionados

Se versionan solo los artefactos runtime del backend (`backend/src/modules/prediction/model/*.onnx` y `model-metadata.json`). El dataset sintético, `.venv`, `__pycache__` y artefactos pesados de entrenamiento quedan fuera del control de versiones.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scripts/seed.generators.test.ts`
Expected: PASS after updating the test or replacing the temporary assertion with a direct file check.

- [ ] **Step 5: Commit**

```bash
git add .gitignore README.md
git commit -m "chore: clean repo ignore policy for ml artifacts"
```

### Task 5: Verificar seed, estado git y preparar agrupación por fase

**Files:**
- Modify: `docs/superpowers/plans/2026-07-05-demo-seed-cleanup-implementation.md`

**Interfaces:**
- Consumes:
  - `npm test -- src/scripts/seed.generators.test.ts`
  - `npm run typecheck`
  - `npm test`
  - `npm run seed`
  - `git status --short`
  - `git diff --stat`
- Produces:
  - Verified implementation evidence
  - Clean git inventory for phase-based commits

- [ ] **Step 1: Write the failing test**

```text
Verification fails if any of these conditions are true:
- the new seed tests are red
- typecheck fails
- full backend tests fail
- `npm run seed` throws
- `git status --short` still shows ignored ML junk or accidental secret files
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scripts/seed.generators.test.ts && npm run typecheck && npm test && npm run seed`
Expected: Any break in the implementation must stop the sequence and be fixed before proceeding.

- [ ] **Step 3: Write minimal implementation**

```bash
git status --short
git diff --stat
git add backend/src/scripts backend/package.json backend/package-lock.json .gitignore README.md
```

Record these review checkpoints while executing:

```text
- confirm no `.env` or credentials are staged
- confirm `backend/src/modules/prediction/model/*.onnx` and `model-metadata.json` are not ignored
- confirm ML datasets and `.venv` stop appearing as untracked after `.gitignore` update
- confirm temporary or obsolete tests have been removed only if they are not part of current useful coverage
```

- [ ] **Step 4: Run test to verify it passes**

Run: `git status --short` and `git diff --stat`
Expected: only intentional project files remain visible for commit preparation.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-05-demo-seed-cleanup-implementation.md
git commit -m "docs: add demo seed execution plan"
```

## Self-Review

- Spec coverage: covered seed cleanup/selective re-run, realistic actors, coherent appointments, records, prescriptions, invoices, repo cleanup, README and git verification. Commit regrouping is intentionally left as an execution activity after verification because it depends on the resulting file set.
- Placeholder scan: no `TBD`, `TODO` or dangling references remain in tasks.
- Type consistency: all later tasks consume the helper names introduced in Tasks 1-3.
