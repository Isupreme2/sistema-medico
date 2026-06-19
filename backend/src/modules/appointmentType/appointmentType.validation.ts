import { z } from 'zod';

export const createTypeSchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(80),
    duracionMin: z.coerce.number().int().min(5).max(240),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{6})$/, 'Color hex inválido (#RRGGBB)')
      .optional(),
    descripcion: z.string().max(200).optional(),
  }),
});

export const updateTypeSchema = z.object({
  body: z.object({
    nombre: z.string().min(1).max(80).optional(),
    duracionMin: z.coerce.number().int().min(5).max(240).optional(),
    color: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
    descripcion: z.string().max(200).optional(),
    activo: z.boolean().optional(),
  }),
});

export type CreateTypeInput = z.infer<typeof createTypeSchema>['body'];
export type UpdateTypeInput = z.infer<typeof updateTypeSchema>['body'];
