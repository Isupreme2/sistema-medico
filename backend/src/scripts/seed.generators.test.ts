import { describe, expect, it } from 'vitest';
import {
  buildRiskKeywords,
  buildDoctorSeedInput,
  buildHistoricalDates,
  buildPatientSeedInput,
  buildRiskTrend,
  buildSafeMedicationPlan,
  buildWeeklySchedule,
  pickDominantSpecialty,
  pickHistoricalVisitCount,
} from './seed.generators';
import type { PatientRiskProfile } from './seed.types';

const highCardio: PatientRiskProfile = {
  cardiovascular: 'alto',
  metabolico: 'bajo',
  respiratorio: 'bajo',
};

const highMetabolic: PatientRiskProfile = {
  cardiovascular: 'bajo',
  metabolico: 'alto',
  respiratorio: 'bajo',
};

const highRespiratory: PatientRiskProfile = {
  cardiovascular: 'bajo',
  metabolico: 'bajo',
  respiratorio: 'alto',
};

const allHigh: PatientRiskProfile = {
  cardiovascular: 'alto',
  metabolico: 'alto',
  respiratorio: 'alto',
};

describe('pickDominantSpecialty', () => {
  it('prioritizes cardiology for dominant cardiovascular risk', () => {
    expect(pickDominantSpecialty(highCardio, ['Medicina General'])).toBe('Cardiología');
  });
});

describe('pickHistoricalVisitCount', () => {
  it('assigns more visits to high-risk profiles than low-risk profiles', () => {
    const low: PatientRiskProfile = {
      cardiovascular: 'bajo',
      metabolico: 'bajo',
      respiratorio: 'bajo',
    };

    expect(pickHistoricalVisitCount(highCardio)).toBeGreaterThan(
      pickHistoricalVisitCount(low),
    );
  });

  it('uses a denser follow-up plan for all-high profiles', () => {
    expect(pickHistoricalVisitCount(allHigh)).toBeGreaterThanOrEqual(8);
  });
});

describe('buildRiskTrend', () => {
  it('keeps cardiovascular pressure elevated across later visits', () => {
    const first = buildRiskTrend({ profile: highCardio, visitIndex: 0, totalVisits: 5 });
    const last = buildRiskTrend({ profile: highCardio, visitIndex: 4, totalVisits: 5 });

    expect(first.presionSistolica).toBeGreaterThanOrEqual(140);
    expect(last.presionSistolica).toBeGreaterThanOrEqual(first.presionSistolica ?? 0);
  });

  it('keeps glucose elevated for dominant metabolic risk', () => {
    const first = buildRiskTrend({ profile: highMetabolic, visitIndex: 0, totalVisits: 4 });
    const last = buildRiskTrend({ profile: highMetabolic, visitIndex: 3, totalVisits: 4 });

    expect(first.glucosa).toBeGreaterThanOrEqual(125);
    expect(last.glucosa).toBeGreaterThanOrEqual(first.glucosa ?? 0);
  });

  it('keeps oxygen saturation lower for dominant respiratory risk', () => {
    const first = buildRiskTrend({ profile: highRespiratory, visitIndex: 0, totalVisits: 4 });
    const last = buildRiskTrend({ profile: highRespiratory, visitIndex: 3, totalVisits: 4 });

    expect(first.saturacionO2).toBeLessThanOrEqual(94);
    expect(last.saturacionO2).toBeLessThanOrEqual(first.saturacionO2 ?? 100);
  });

  it('combines severe abnormalities for all-high profiles', () => {
    const trend = buildRiskTrend({ profile: allHigh, visitIndex: 7, totalVisits: 8 });

    expect(trend.presionSistolica).toBeGreaterThanOrEqual(170);
    expect(trend.glucosa).toBeGreaterThanOrEqual(180);
    expect(trend.saturacionO2).toBeLessThanOrEqual(90);
  });
});

describe('buildRiskKeywords', () => {
  it('returns controlled keywords for all-high profiles', () => {
    const keywords = buildRiskKeywords(allHigh);

    expect(keywords).toEqual(
      expect.arrayContaining(['hipertension', 'diabetes', 'disnea']),
    );
  });
});

describe('buildSafeMedicationPlan', () => {
  it('avoids medications matching patient allergies', () => {
    const meds = buildSafeMedicationPlan({
      specialty: 'Cardiología',
      alergias: ['aspirina'],
    });

    expect(meds.some((med) => med.nombre.toLowerCase().includes('aspirina'))).toBe(false);
  });

  it('returns specialty-specific medication for endocrinology', () => {
    const meds = buildSafeMedicationPlan({
      specialty: 'Endocrinología',
      alergias: [],
    });

    expect(meds.some((med) => med.nombre.toLowerCase().includes('metformina'))).toBe(true);
  });

  it('returns specialty-specific medication for neumology', () => {
    const meds = buildSafeMedicationPlan({
      specialty: 'Neumología',
      alergias: [],
    });

    expect(meds.some((med) => med.nombre.toLowerCase().includes('salbutamol'))).toBe(true);
  });
});

describe('buildDoctorSeedInput', () => {
  it('uses the seed email namespace and unique colegiatura', () => {
    const doctor = buildDoctorSeedInput(3, 'Cardiología');

    expect(doctor.email).toContain('seed.demo+doctor.3');
    expect(doctor.numeroColegiatura.startsWith('SEED-')).toBe(true);
  });
});

describe('buildPatientSeedInput', () => {
  it('creates unique seed identity fields', () => {
    const patient = buildPatientSeedInput(9);

    expect(patient.email).toContain('seed.demo+patient.9');
    expect(patient.numeroDocumento).toMatch(/^\d{8}$/);
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
  it('returns the requested number of past dates aligned to the schedule weekdays', () => {
    const schedule = buildWeeklySchedule(30);
    const dates = buildHistoricalDates({
      monthsBack: 6,
      visitCount: 4,
      weeklySchedule: schedule,
    });

    expect(dates).toHaveLength(4);
    expect(dates.every((date) => date.getTime() < Date.now())).toBe(true);
    expect(schedule.some((slot) => slot.diaSemana === dates[0].getDay())).toBe(true);
  });
});
