import { z } from 'zod';
import { AppointmentStatus, AppointmentModality } from '../../models/appointment.model';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Id inválido');

export const createAppointmentSchema = z.object({
  body: z.object({
    medicoId: objectId,
    /**
     * Paciente para el que se reserva. Lo usa Recepción/Admin al agendar por un
     * tercero; cuando reserva el propio paciente se ignora (se toma su id del token).
     */
    pacienteId: objectId.optional(),
    fechaHora: z.coerce.date(),
    tipoCitaId: objectId.optional(),
    modalidad: z
      .enum([AppointmentModality.PRESENCIAL, AppointmentModality.TELECONSULTA])
      .default(AppointmentModality.PRESENCIAL),
    /** Motivo de la visita: obligatorio (Recepción/Admin lo registran al agendar). */
    motivo: z
      .string()
      .trim()
      .min(1, 'Indica el motivo de la consulta')
      .max(500, 'El motivo no puede superar 500 caracteres'),
    /** Solo en el flujo de paciente con pago (reservar-y-pagar). */
    metodoPago: z.string().max(60).optional(),
  }),
});

/**
 * Reserva del paciente con pago: el motivo de consulta es OBLIGATORIO
 * (la clínica necesita saber a qué viene antes de confirmar la cita).
 */
export const reservarPagarSchema = z.object({
  body: z.object({
    medicoId: objectId,
    fechaHora: z.coerce.date(),
    tipoCitaId: objectId.optional(),
    modalidad: z
      .enum([AppointmentModality.PRESENCIAL, AppointmentModality.TELECONSULTA])
      .default(AppointmentModality.PRESENCIAL),
    motivo: z
      .string()
      .trim()
      .min(1, 'Cuéntanos brevemente el motivo de tu consulta')
      .max(500, 'El motivo no puede superar 500 caracteres'),
    metodoPago: z.string().max(60).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    estado: z.enum([AppointmentStatus.ATENDIDA, AppointmentStatus.NO_ASISTIO]),
  }),
});

export const preConsultaSchema = z.object({
  body: z.object({
    motivoConsulta: z.string().min(1, 'El motivo es obligatorio').max(1000),
    sintomas: z.string().max(2000).optional(),
    inicioSintomas: z.string().max(200).optional(),
    nivelDolor: z.coerce.number().min(0).max(10).optional(),
    medicacionActual: z.string().max(2000).optional(),
    antecedentes: z.string().max(2000).optional(),
  }),
});

export const alternativosQuerySchema = z.object({
  query: z.object({
    medicoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Id de médico inválido'),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (usar YYYY-MM-DD)'),
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (usar HH:mm)').optional(),
  }),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>['body'];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
export type PreConsultaInput = z.infer<typeof preConsultaSchema>['body'];
