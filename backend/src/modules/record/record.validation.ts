import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Id inválido');

/** Campo numérico de signo vital con rango y mensajes en español. */
const rango = (campo: string, min: number, max: number, unidad: string) =>
  z.coerce
    .number({ invalid_type_error: `${campo} debe ser un número` })
    .min(min, `${campo} debe estar entre ${min} y ${max} ${unidad}`)
    .max(max, `${campo} debe estar entre ${min} y ${max} ${unidad}`)
    .optional();

const signosVitales = z
  .object({
    peso: rango('El peso', 0, 500, 'kg'),
    talla: rango('La talla', 0, 300, 'cm'),
    presionSistolica: rango('La presión sistólica', 0, 300, 'mmHg'),
    presionDiastolica: rango('La presión diastólica', 0, 200, 'mmHg'),
    frecuenciaCardiaca: rango('La frecuencia cardíaca', 0, 400, 'lpm'),
    temperatura: rango('La temperatura', 0, 50, '°C'),
    glucosa: rango('La glucosa', 0, 1000, 'mg/dL'),
    saturacionO2: rango('La saturación de O₂', 0, 100, '%'),
  })
  .optional();

export const createRecordSchema = z.object({
  body: z.object({
    pacienteId: objectId,
    citaId: objectId.optional(),
    motivo: z.string().max(500, 'El motivo no puede superar 500 caracteres').optional(),
    diagnostico: z
      .string()
      .min(1, 'El diagnóstico es obligatorio')
      .max(2000, 'El diagnóstico no puede superar 2000 caracteres'),
    cie10: z.string().max(20, 'El código CIE-10 no puede superar 20 caracteres').optional(),
    notas: z.string().max(5000, 'Las notas no pueden superar 5000 caracteres').optional(),
    tratamiento: z
      .string()
      .max(5000, 'El tratamiento no puede superar 5000 caracteres')
      .optional(),
    signosVitales,
  }),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>['body'];
