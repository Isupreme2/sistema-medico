import { Router } from 'express';
import * as ctrl from './appointment.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import { createAppointmentSchema, updateStatusSchema } from './appointment.validation';

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
router.post(
  '/',
  authenticate,
  authorize(UserRole.PACIENTE),
  validate(createAppointmentSchema),
  ctrl.reservar,
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

export default router;
