import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMPFindOne = vi.fn();
const mockMPFind = vi.fn();
const mockAppFind = vi.fn();
const mockBloqueoFind = vi.fn();

function buildProfile(userId: string, extra: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => `pid_${userId}` },
    usuarioId: { toString: () => userId },
    especialidad: 'Cardiología',
    duracionSlotMin: 30,
    activo: true,
    horarios: [{ diaSemana: 1, horaInicio: '09:00', horaFin: '13:00' }],
    ...extra,
  };
}

function makeFakeQuery(profile: Record<string, unknown>) {
  const populated = {
    ...profile,
    usuarioId: {
      _id: { toString: () => String(profile.usuarioId.toString()) },
      nombre: 'Juan',
      apellido: 'Perez',
      email: `${String(profile.usuarioId.toString())}@test.com`,
    },
  };

  let resolveTo: Record<string, unknown> = profile;
  const query = {
    populate: vi.fn(() => {
      resolveTo = populated;
      return query;
    }),
    then: (resolve: Function) => resolve(resolveTo),
    catch: vi.fn(),
  };
  return query;
}

vi.mock('../../models/medicoProfile.model', () => ({
  MedicoProfile: {
    findOne: (...args: unknown[]) => mockMPFindOne(...args),
    find: (...args: unknown[]) => mockMPFind(...args),
  },
}));

vi.mock('../../models/appointment.model', () => ({
  Appointment: {
    find: (...args: unknown[]) => mockAppFind(...args),
  },
  AppointmentStatus: { RESERVADA: 'reservada' },
}));

vi.mock('../../models/bloqueo.model', () => ({
  Bloqueo: {
    find: (...args: unknown[]) => mockBloqueoFind(...args),
  },
}));

vi.mock('../../utils/slots', () => ({
  computeSlots: vi.fn(() => [
    { hora: '10:00', fechaHora: '2026-07-10T15:00:00.000Z', disponible: true },
    { hora: '10:30', fechaHora: '2026-07-10T15:30:00.000Z', disponible: true },
  ]),
  buildDate: vi.fn(() => new Date('2026-07-10T05:00:00.000Z')),
  enHoraClinica: vi.fn(() => ({ diaSemana: 1, minutos: 0 })),
  toMinutes: vi.fn((h: string) => { const [h1, m1] = h.split(':').map(Number); return h1 * 60 + m1; }),
  dentroDeFranja: vi.fn(() => true),
  enBloqueo: vi.fn(() => false),
  toHHmm: vi.fn((min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`),
  CLINIC_OFFSET: '-05:00',
}));

import { findAlternatives } from './appointment.alternativos.service';

const profiles = new Map<string, ReturnType<typeof buildProfile>>();

function setupFindOne() {
  mockMPFindOne.mockImplementation((query: Record<string, unknown>) => {
    const uid = typeof query.usuarioId === 'string' ? query.usuarioId : 'default';
    const p = profiles.get(uid) ?? buildProfile(uid);
    return makeFakeQuery(p);
  });
}

describe('findAlternatives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profiles.clear();
  });

  it('retorna alternativos en misma especialidad excluyendo al de referencia', async () => {
    profiles.set('ref123', buildProfile('ref123'));
    profiles.set('alt1', buildProfile('alt1'));
    profiles.set('alt2', buildProfile('alt2'));
    setupFindOne();

    mockMPFind.mockResolvedValue([
      buildProfile('alt1'),
      buildProfile('alt2'),
    ]);

    mockAppFind.mockResolvedValue([]);
    mockBloqueoFind.mockResolvedValue([]);

    const result = await findAlternatives('ref123', '2026-07-10');

    expect(result.especialidad).toBe('Cardiología');
    expect(result.alternativos).toHaveLength(2);
  });

  it('excluye al médico de referencia de los resultados', async () => {
    profiles.set('ref123', buildProfile('ref123'));
    profiles.set('alt1', buildProfile('alt1'));
    setupFindOne();

    mockMPFind.mockResolvedValue([buildProfile('alt1')]);
    mockAppFind.mockResolvedValue([]);
    mockBloqueoFind.mockResolvedValue([]);

    const result = await findAlternatives('ref123', '2026-07-10');

    expect(result.alternativos).toHaveLength(1);
    const ids = result.alternativos.map((a) => a.medico.usuarioId._id.toString());
    expect(ids).not.toContain('ref123');
    expect(ids).toContain('alt1');
  });

  it('marca coincideHora=true cuando un alternativo tiene slot exacto a la hora solicitada', async () => {
    profiles.set('ref123', buildProfile('ref123'));
    profiles.set('alt1', buildProfile('alt1'));
    setupFindOne();

    mockMPFind.mockResolvedValue([buildProfile('alt1')]);
    mockAppFind.mockResolvedValue([]);
    mockBloqueoFind.mockResolvedValue([]);

    const result = await findAlternatives('ref123', '2026-07-10', '10:00');

    expect(result.alternativos[0].coincideHora).toBe(true);
    expect(result.coincideHora).toBe(true);
  });

  it('hace fallback a Medicina General cuando especialidad original no tiene disponibilidad', async () => {
    profiles.set('ref123', buildProfile('ref123'));
    profiles.set('mg1', buildProfile('mg1', { especialidad: 'Medicina General' }));
    setupFindOne();

    mockMPFind
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildProfile('mg1', { especialidad: 'Medicina General' })]);

    mockAppFind.mockResolvedValue([]);
    mockBloqueoFind.mockResolvedValue([]);

    const result = await findAlternatives('ref123', '2026-07-10');

    expect(result.alternativos).toHaveLength(0);
    expect(result.especialidadAlternativa).toBeDefined();
    expect(result.especialidadAlternativa!.especialidad).toBe('Medicina General');
    expect(result.especialidadAlternativa!.alternativos).toHaveLength(1);
  });

  it('retorna arrays vacíos cuando no hay alternativos en ninguna especialidad', async () => {
    profiles.set('ref123', buildProfile('ref123'));
    setupFindOne();

    mockMPFind
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mockAppFind.mockResolvedValue([]);
    mockBloqueoFind.mockResolvedValue([]);

    const result = await findAlternatives('ref123', '2026-07-10');

    expect(result.alternativos).toHaveLength(0);
    expect(result.especialidadAlternativa).toBeUndefined();
    expect(result.coincideHora).toBe(false);
  });
});
