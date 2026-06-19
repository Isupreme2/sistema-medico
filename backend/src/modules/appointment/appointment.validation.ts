import { z } from 'zod';
import { AppointmentStatus } from '../../models/appointment.model';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Id inválido');

export const createAppointmentSchema = z.object({
  body: z.object({
    medicoId: objectId,
    fechaHora: z.coerce.date(),
    appointmentTypeId: objectId.optional(),
    motivo: z.string().max(500).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    estado: z.enum([AppointmentStatus.ATENDIDA, AppointmentStatus.NO_ASISTIO]),
  }),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>['body'];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
