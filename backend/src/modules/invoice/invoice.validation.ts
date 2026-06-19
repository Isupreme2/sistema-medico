import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Id inválido');

export const createInvoiceSchema = z.object({
  body: z
    .object({
      appointmentId: objectId.optional(),
      pacienteId: objectId.optional(),
      impuestoPct: z.coerce.number().min(0).max(100).default(18),
      notas: z.string().max(1000).optional(),
      items: z
        .array(
          z.object({
            descripcion: z.string().min(1, 'Descripción requerida').max(300),
            cantidad: z.coerce.number().int().min(1),
            precioUnitario: z.coerce.number().min(0),
          }),
        )
        .min(1, 'Agrega al menos un ítem'),
    })
    .refine((b) => b.appointmentId || b.pacienteId, {
      message: 'Indica appointmentId o pacienteId',
      path: ['appointmentId'],
    }),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>['body'];
