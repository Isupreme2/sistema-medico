import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede exceder 72 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

/** Alta de personal de recepción (Registrador) por parte del Admin. */
export const createStaffSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: passwordSchema,
    nombre: z.string().min(1, 'El nombre es obligatorio').max(80),
    apellido: z.string().min(1, 'El apellido es obligatorio').max(80),
    telefono: z.string().max(30).optional(),
  }),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>['body'];
