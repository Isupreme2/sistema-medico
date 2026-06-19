import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Id inválido');

export const emitirSchema = z.object({
  body: z.object({
    pacienteId: objectId,
    recordId: objectId.optional(),
    medicamentos: z
      .array(
        z.object({
          nombre: z.string().min(1, 'Nombre del medicamento requerido').max(120),
          dosis: z.string().min(1, 'Dosis requerida').max(80),
          frecuencia: z.string().min(1, 'Frecuencia requerida').max(80),
          duracion: z.string().min(1, 'Duración requerida').max(80),
        }),
      )
      .min(1, 'Agrega al menos un medicamento'),
    indicaciones: z.string().max(2000).optional(),
    /** El médico confirma emitir pese a las alertas de seguridad. */
    confirmar: z.boolean().optional(),
  }),
});

export type EmitirInput = z.infer<typeof emitirSchema>['body'];
