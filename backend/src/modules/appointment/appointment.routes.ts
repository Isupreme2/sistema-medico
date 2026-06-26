import { Router } from 'express';
import * as ctrl from './appointment.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import {
  createAppointmentSchema,
  updateStatusSchema,
  preConsultaSchema,
} from './appointment.validation';

const router = Router();

/**
 * @openapi
 * /appointments/disponibilidad/{id}:
 *   get:
 *     tags: [Citas]
 *     summary: Slots disponibles de un médico en una fecha
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: userId del médico
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema: { type: string, example: "2026-06-22" }
 *     responses:
 *       200: { description: Lista de slots (disponible true/false) }
 */
router.get('/disponibilidad/:id', authenticate, ctrl.disponibilidad);

/**
 * @openapi
 * /appointments:
 *   get:
 *     tags: [Citas]
 *     summary: Lista de citas (filtradas por rol)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Citas }
 *   post:
 *     tags: [Citas]
 *     summary: Reservar cita (Paciente) — reserva atómica
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Cita reservada }
 *       409: { description: Slot ya tomado }
 *       422: { description: Fuera del horario de atención }
 */
router.get('/', authenticate, ctrl.listar);
// Reserva sin pago: solo personal (Recepción/Admin); el cobro va por caja/factura.
router.post(
  '/',
  authenticate,
  authorize(UserRole.RECEPCIONISTA, UserRole.ADMIN),
  validate(createAppointmentSchema),
  ctrl.reservar,
);

/**
 * @openapi
 * /appointments/reservar-y-pagar:
 *   post:
 *     tags: [Citas]
 *     summary: Reserva del paciente con pago obligatorio (crea cita + factura pagada)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Cita reservada y pagada }
 *       409: { description: Slot ya tomado }
 */
router.post(
  '/reservar-y-pagar',
  authenticate,
  authorize(UserRole.PACIENTE),
  validate(createAppointmentSchema),
  ctrl.reservarYPagar,
);

/**
 * @openapi
 * /appointments/{id}/cancel:
 *   patch:
 *     tags: [Citas]
 *     summary: Cancelar cita (paciente dueño, médico o admin) — libera el slot
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Cita cancelada }
 */
router.patch('/:id/cancel', authenticate, ctrl.cancelar);

/**
 * @openapi
 * /appointments/{id}/status:
 *   patch:
 *     tags: [Citas]
 *     summary: Marcar cita como atendida o no-asistió (Médico)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Estado actualizado }
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.MEDICO, UserRole.ADMIN),
  validate(updateStatusSchema),
  ctrl.actualizarEstado,
);

/**
 * @openapi
 * /appointments/{id}/video:
 *   get:
 *     tags: [Teleconsulta]
 *     summary: Datos de acceso a la sala de video (participante de la cita)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sala, dominio y si se puede entrar (ventana horaria) }
 *       422: { description: La cita no es teleconsulta }
 */
router.get('/:id/video', authenticate, ctrl.videoAccess);

/**
 * @openapi
 * /appointments/{id}/preconsulta:
 *   get:
 *     tags: [Teleconsulta]
 *     summary: Ver el formulario de pre-consulta (médico de la cita, paciente dueño o admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Formulario (o null si no existe) }
 *   post:
 *     tags: [Teleconsulta]
 *     summary: Enviar/actualizar el formulario de pre-consulta (Paciente dueño)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Formulario guardado }
 *       403: { description: Solo el paciente de la cita }
 */
router.get('/:id/preconsulta', authenticate, ctrl.getPreConsulta);
router.post(
  '/:id/preconsulta',
  authenticate,
  authorize(UserRole.PACIENTE),
  validate(preConsultaSchema),
  ctrl.submitPreConsulta,
);

export default router;
