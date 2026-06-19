import { z } from 'zod';

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const horarioItem = z
  .object({
    diaSemana: z.coerce.number().int().min(0).max(6),
    horaInicio: z.string().regex(horaRegex, 'Hora inválida (HH:mm)'),
    horaFin: z.string().regex(horaRegex, 'Hora inválida (HH:mm)'),
  })
  .refine((h) => h.horaInicio < h.horaFin, {
    message: 'horaInicio debe ser anterior a horaFin',
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
  body: z.object({
    duracionSlotMin: z.coerce.number().int().min(5).max(240).optional(),
    horarios: z.array(horarioItem).max(50),
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
