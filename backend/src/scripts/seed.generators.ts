import { faker } from '@faker-js/faker';
import { buildDate } from '../utils/slots';
import type {
  PatientRiskProfile,
  SeedDoctorInput,
  SeedMedication,
  SeedPatientInput,
  SeedScheduleSlot,
  SeedVitals,
} from './seed.types';

function buildPhoneNumber(): string {
  return `9${faker.string.numeric(8)}`;
}

const RISK_WEIGHT = { bajo: 1, medio: 2, alto: 3 } as const;
const TREND_WEIGHT = { bajo: 0, medio: 1, alto: 2 } as const;

export function pickDominantSpecialty(
  profile: PatientRiskProfile,
  fallback: string[],
): string {
  if (profile.cardiovascular === 'alto') return 'Cardiología';
  if (profile.metabolico === 'alto') return 'Endocrinología';
  if (profile.respiratorio === 'alto') return 'Neumología';
  return fallback[0] ?? 'Medicina General';
}

export function pickHistoricalVisitCount(profile: PatientRiskProfile): number {
  if (
    profile.cardiovascular === 'alto' &&
    profile.metabolico === 'alto' &&
    profile.respiratorio === 'alto'
  ) {
    return 8;
  }

  const maxRisk = Math.max(
    RISK_WEIGHT[profile.cardiovascular],
    RISK_WEIGHT[profile.metabolico],
    RISK_WEIGHT[profile.respiratorio],
  );

  if (maxRisk === RISK_WEIGHT.alto) return 6;
  if (maxRisk === RISK_WEIGHT.medio) return 4;
  return 3;
}

export function buildRiskTrend(params: {
  profile: PatientRiskProfile;
  visitIndex: number;
  totalVisits: number;
}): SeedVitals {
  const progress =
    params.totalVisits <= 1 ? 0 : params.visitIndex / (params.totalVisits - 1);

  const cardio = TREND_WEIGHT[params.profile.cardiovascular];
  const metabolic = TREND_WEIGHT[params.profile.metabolico];
  const respiratory = TREND_WEIGHT[params.profile.respiratorio];

  const vitals: SeedVitals = {
    peso: 70,
    talla: 170,
    presionSistolica: 118,
    presionDiastolica: 78,
    frecuenciaCardiaca: 72,
    temperatura: 36.7,
    saturacionO2: 98,
  };

  if (cardio > 0) {
    vitals.peso = Math.round(76 + cardio * 6 + progress * 2);
    vitals.presionSistolica = Math.round(118 + cardio * 24 + progress * cardio * 6);
    vitals.presionDiastolica = Math.round(78 + cardio * 12 + progress * cardio * 3);
    vitals.frecuenciaCardiaca = Math.round(72 + cardio * 10 + progress * cardio * 2);
    vitals.temperatura = 36.8;
    vitals.saturacionO2 = 97;
  }

  if (metabolic > 0) {
    vitals.talla = 165;
    vitals.peso = Math.max(vitals.peso ?? 0, Math.round(82 + metabolic * 6 + progress * 3));
    vitals.presionSistolica = Math.max(
      vitals.presionSistolica ?? 0,
      Math.round(126 + metabolic * 10 + progress * metabolic * 3),
    );
    vitals.presionDiastolica = Math.max(
      vitals.presionDiastolica ?? 0,
      Math.round(82 + metabolic * 5 + progress * metabolic * 2),
    );
    vitals.frecuenciaCardiaca = Math.max(
      vitals.frecuenciaCardiaca ?? 0,
      Math.round(78 + metabolic * 4 + progress * metabolic * 2),
    );
    vitals.glucosa = Math.round(100 + metabolic * 40 + progress * metabolic * 10);
  }

  if (respiratory > 0) {
    vitals.frecuenciaCardiaca = Math.max(
      vitals.frecuenciaCardiaca ?? 0,
      Math.round(80 + respiratory * 5 + progress * respiratory * 2),
    );
    vitals.temperatura = Math.max(vitals.temperatura ?? 36.7, 36.9 + respiratory * 0.15);
    vitals.saturacionO2 = Math.round(97 - respiratory * 3 - progress * respiratory * 2);
  }

  return vitals;
}

export function buildRiskKeywords(profile: PatientRiskProfile): string[] {
  const keywords = new Set<string>();

  if (profile.cardiovascular !== 'bajo') {
    keywords.add('hipertension');
    keywords.add('presion alta');
    keywords.add('palpitaciones');
  }

  if (profile.metabolico !== 'bajo') {
    keywords.add('diabetes');
    keywords.add('glucosa');
    keywords.add('obesidad');
  }

  if (profile.respiratorio !== 'bajo') {
    keywords.add('asma');
    keywords.add('disnea');
    keywords.add('tos');
  }

  return [...keywords];
}

export function buildSafeMedicationPlan(params: {
  specialty: string;
  alergias: string[];
}): SeedMedication[] {
  const allergies = new Set(params.alergias.map((item) => item.toLowerCase().trim()));

  const specialtyCatalogs: Record<string, SeedMedication[]> = {
    'Cardiología': [
      {
        nombre: 'Losartan',
        dosis: '50mg',
        frecuencia: 'cada 24h',
        duracion: '30 dias',
      },
      {
        nombre: 'Aspirina',
        dosis: '100mg',
        frecuencia: 'cada 24h',
        duracion: '30 dias',
      },
    ],
    'Endocrinología': [
      {
        nombre: 'Metformina',
        dosis: '850mg',
        frecuencia: 'cada 12h',
        duracion: '30 dias',
      },
      {
        nombre: 'Atorvastatina',
        dosis: '20mg',
        frecuencia: 'cada 24h',
        duracion: '30 dias',
      },
    ],
    'Neumología': [
      {
        nombre: 'Salbutamol inhalador',
        dosis: '2 puff',
        frecuencia: 'cada 8h',
        duracion: '14 dias',
      },
      {
        nombre: 'Budesonida inhalada',
        dosis: '200mcg',
        frecuencia: 'cada 12h',
        duracion: '14 dias',
      },
    ],
  };

  const defaultCatalog: SeedMedication[] = [
    {
      nombre: 'Paracetamol',
      dosis: '500mg',
      frecuencia: 'cada 8h',
      duracion: '5 dias',
    },
  ];

  const catalog = specialtyCatalogs[params.specialty] ?? defaultCatalog;
  const safePlan = catalog.filter((med) => !allergies.has(med.nombre.toLowerCase()));

  return safePlan.length > 0 ? safePlan : defaultCatalog;
}

export function buildDoctorSeedInput(
  index: number,
  specialty: string,
): SeedDoctorInput {
  return {
    email: `seed.demo+doctor.${index}@ehr.dev`,
    password: 'SeedDemo1234',
    nombre: faker.person.firstName(),
    apellido: faker.person.lastName(),
    telefono: buildPhoneNumber(),
    especialidad: specialty,
    numeroColegiatura: `SEED-MED-${String(index).padStart(4, '0')}`,
    duracionSlotMin: 30,
  };
}

export function buildPatientSeedInput(index: number): SeedPatientInput {
  const riskProfiles: PatientRiskProfile[] = [
    { cardiovascular: 'alto', metabolico: 'alto', respiratorio: 'alto' },
    { cardiovascular: 'alto', metabolico: 'medio', respiratorio: 'bajo' },
    { cardiovascular: 'bajo', metabolico: 'alto', respiratorio: 'medio' },
    { cardiovascular: 'bajo', metabolico: 'medio', respiratorio: 'alto' },
    { cardiovascular: 'bajo', metabolico: 'bajo', respiratorio: 'bajo' },
  ];

  return {
    email: `seed.demo+patient.${index}@ehr.dev`,
    password: 'SeedDemo1234',
    nombre: faker.person.firstName(),
    apellido: faker.person.lastName(),
    telefono: buildPhoneNumber(),
    tipoDocumento: 'DNI',
    numeroDocumento: String(10_000_000 + index).slice(-8),
    alergias: index % 5 === 0 ? ['aspirina'] : index % 7 === 0 ? ['penicilina'] : [],
    profile: riskProfiles[(index - 1) % riskProfiles.length],
  };
}

export function buildWeeklySchedule(slotMinutes: number): SeedScheduleSlot[] {
  void slotMinutes;
  return [1, 2, 3, 4, 5].flatMap((diaSemana) => [
    { diaSemana, horaInicio: '08:00', horaFin: '12:00' },
    { diaSemana, horaInicio: '15:00', horaFin: '18:00' },
  ]);
}

export function buildHistoricalDates(params: {
  monthsBack: number;
  visitCount: number;
  weeklySchedule: SeedScheduleSlot[];
}): Date[] {
  const { monthsBack, visitCount, weeklySchedule } = params;
  const scheduleDays = [...new Set(weeklySchedule.map((slot) => slot.diaSemana))].sort();
  const dates: Date[] = [];

  for (let index = 0; index < visitCount; index += 1) {
    const date = new Date();
    const day = scheduleDays[index % scheduleDays.length] ?? 1;
    const weeksBack = Math.max(1, Math.ceil(((monthsBack * 4) / visitCount) * (visitCount - index)));
    date.setDate(date.getDate() - weeksBack * 7);
    while (date.getDay() !== day) {
      date.setDate(date.getDate() - 1);
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getDate()).padStart(2, '0');
    const dateKey = `${date.getFullYear()}-${month}-${dayOfMonth}`;
    const hour = `${String(9 + (index % 3)).padStart(2, '0')}:00`;
    dates.push(buildDate(dateKey, hour));
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}
