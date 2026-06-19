import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Id inválido');

const signosVitales = z
  .object({
    peso: z.coerce.number().min(0).max(500).optional(),
    talla: z.coerce.number().min(0).max(300).optional(),
    presionSistolica: z.coerce.number().min(0).max(300).optional(),
    presionDiastolica: z.coerce.number().min(0).max(200).optional(),
    frecuenciaCardiaca: z.coerce.number().min(0).max(400).optional(),
    temperatura: z.coerce.number().min(0).max(50).optional(),
    glucosa: z.coerce.number().min(0).max(1000).optional(),
    saturacionO2: z.coerce.number().min(0).max(100).optional(),
  })
  .optional();

export const createRecordSchema = z.object({
  body: z.object({
    pacienteId: objectId,
    appointmentId: objectId.optional(),
    motivo: z.string().max(500).optional(),
    diagnostico: z.string().min(1, 'El diagnóstico es obligatorio').max(2000),
    cie10: z.string().max(20).optional(),
    notas: z.string().max(5000).optional(),
    tratamiento: z.string().max(5000).optional(),
    signosVitales,
  }),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>['body'];
