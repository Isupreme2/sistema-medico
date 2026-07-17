import { z } from 'zod';
import { FORMAS, MOMENTOS } from '../../constants/medicationForms';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Id inválido');
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm)');

const medicamento = z
  .object({
    forma: z.enum(FORMAS as [string, ...string[]]),
    nombre: z.string().min(1, 'Nombre del medicamento requerido').max(120),
    concentracion: z.string().min(1, 'Concentración requerida').max(80),
    cantidad: z.string().min(1, 'Cantidad a tomar requerida').max(40),
    momento: z.enum(MOMENTOS).optional(),
    segunNecesidad: z.boolean().optional().default(false),
    horas: z.array(hora).min(1).max(12).optional(),
    dias: z.number().int().min(1).max(365).optional(),
  })
  .refine((m) => m.segunNecesidad || ((m.horas?.length ?? 0) >= 1 && (m.dias ?? 0) >= 1), {
    message: 'Indica al menos un horario y los días de toma, o marca "según necesidad".',
    path: ['horas'],
  });

export const emitirSchema = z.object({
  body: z.object({
    pacienteId: objectId,
    historialId: objectId.optional(),
    /** Inicio del tratamiento (ISO). Si se omite, se usa el momento de emisión. */
    inicio: z.string().datetime({ offset: true }).optional(),
    medicamentos: z.array(medicamento).min(1, 'Agrega al menos un medicamento'),
    indicaciones: z.string().max(2000).optional(),
    /** El médico confirma emitir pese a las alertas de seguridad. */
    confirmar: z.boolean().optional(),
  }),
});

export type EmitirInput = z.infer<typeof emitirSchema>['body'];
export type MedicamentoInput = z.infer<typeof medicamento>;
