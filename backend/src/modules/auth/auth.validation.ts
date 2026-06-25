import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede exceder 72 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

export const registerSchema = z.object({
  body: z
    .object({
      email: z.string().email('Email inválido'),
      password: passwordSchema,
      nombre: z.string().min(1, 'El nombre es obligatorio').max(80),
      apellido: z.string().min(1, 'El apellido es obligatorio').max(80),
      telefono: z.string().max(30).optional(),
      tipoDocumento: z.enum(['DNI', 'CE', 'PAS']).default('DNI'),
      numeroDocumento: z
        .string()
        .trim()
        .min(6, 'Número de documento inválido')
        .max(20, 'Número de documento inválido'),
    })
    .refine((b) => b.tipoDocumento !== 'DNI' || /^\d{8}$/.test(b.numeroDocumento), {
      message: 'El DNI debe tener exactamente 8 dígitos',
      path: ['numeroDocumento'],
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
    /** Código TOTP de 6 dígitos, requerido solo si el usuario tiene 2FA activo. */
    totp: z.string().length(6).optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
