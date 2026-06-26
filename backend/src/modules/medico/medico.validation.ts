import { z } from 'zod';

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMin = (s: string): number => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

const horarioItem = z
  .object({
    diaSemana: z.coerce.number().int().min(0).max(6),
    horaInicio: z.string().regex(horaRegex, 'Hora inválida (HH:mm)'),
    horaFin: z.string().regex(horaRegex, 'Hora inválida (HH:mm)'),
  })
  .refine((h) => h.horaInicio < h.horaFin, {
    message: 'La hora de inicio debe ser anterior a la de fin',
    path: ['horaFin'],
  });

export const createMedicoSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[a-z]/, 'Debe incluir minúscula')
      .regex(/[A-Z]/, 'Debe incluir mayúscula')
      .regex(/[0-9]/, 'Debe incluir número'),
    nombre: z.string().min(1).max(80),
    apellido: z.string().min(1).max(80),
    telefono: z.string().max(30).optional(),
    especialidad: z.string().min(1, 'La especialidad es obligatoria').max(120),
    numeroColegiatura: z.string().min(1, 'La colegiatura es obligatoria').max(40),
    duracionSlotMin: z.coerce.number().int().min(5).max(240).optional(),
  }),
});

export const updateHorarioSchema = z.object({
  body: z
    .object({
      duracionSlotMin: z.coerce.number().int().min(5).max(240).optional(),
      horarios: z.array(horarioItem).max(50),
    })
    .superRefine((b, ctx) => {
      // 1) Cada franja debe ser múltiplo de la duración del slot (sin minutos muertos).
      if (b.duracionSlotMin) {
        b.horarios.forEach((h, i) => {
          const dur = toMin(h.horaFin) - toMin(h.horaInicio);
          if (dur % b.duracionSlotMin! !== 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `La franja ${h.horaInicio}–${h.horaFin} debe ser múltiplo de ${b.duracionSlotMin} min (la duración de cada cita)`,
              path: ['horarios', i, 'horaFin'],
            });
          }
        });
      }
      // 2) No se permiten franjas solapadas o duplicadas el mismo día.
      for (let i = 0; i < b.horarios.length; i++) {
        for (let j = i + 1; j < b.horarios.length; j++) {
          const a = b.horarios[i];
          const c = b.horarios[j];
          if (a.diaSemana !== c.diaSemana) continue;
          if (toMin(a.horaInicio) < toMin(c.horaFin) && toMin(c.horaInicio) < toMin(a.horaFin)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Tienes franjas solapadas o repetidas el mismo día (${a.horaInicio}–${a.horaFin} y ${c.horaInicio}–${c.horaFin})`,
              path: ['horarios', j],
            });
          }
        }
      }
    }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    especialidad: z.string().min(1).max(120).optional(),
    numeroColegiatura: z.string().min(1).max(40).optional(),
    activo: z.boolean().optional(),
  }),
});

export const createBloqueoSchema = z.object({
  body: z
    .object({
      desde: z.coerce.date(),
      hasta: z.coerce.date(),
      motivo: z.string().max(200).optional(),
    })
    .refine((b) => b.desde < b.hasta, {
      message: 'desde debe ser anterior a hasta',
      path: ['hasta'],
    }),
});

export type CreateMedicoInput = z.infer<typeof createMedicoSchema>['body'];
export type UpdateHorarioInput = z.infer<typeof updateHorarioSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type CreateBloqueoInput = z.infer<typeof createBloqueoSchema>['body'];
