import { Router } from 'express';
import * as ctrl from './medico.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import {
  createMedicoSchema,
  updateHorarioSchema,
  updateProfileSchema,
  createBloqueoSchema,
} from './medico.validation';

const router = Router();

/**
 * @openapi
 * /medicos:
 *   get:
 *     tags: [Médicos]
 *     summary: Lista de médicos (perfil + datos básicos)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: activos
 *         schema: { type: boolean }
 *         description: Si es true, solo médicos activos
 *     responses:
 *       200: { description: Listado de médicos }
 *   post:
 *     tags: [Médicos]
 *     summary: Crear médico (solo Admin) — crea usuario + perfil
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Médico creado }
 *       403: { description: Solo Admin }
 *       409: { description: Email ya registrado }
 */
router.get('/', authenticate, ctrl.listMedicos);
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(createMedicoSchema),
  ctrl.createMedico,
);

/**
 * @openapi
 * /medicos/{id}:
 *   get:
 *     tags: [Médicos]
 *     summary: Detalle de un médico por su userId
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Médico }
 *       404: { description: No encontrado }
 */
router.get('/:id', authenticate, ctrl.getMedico);

/**
 * @openapi
 * /medicos/{id}:
 *   patch:
 *     tags: [Médicos]
 *     summary: Actualizar credenciales del médico — especialidad, colegiatura, estado (solo la Dirección / Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Perfil actualizado }
 */
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(updateProfileSchema),
  ctrl.updateProfile,
);

/**
 * @openapi
 * /medicos/{id}/horario:
 *   put:
 *     tags: [Médicos]
 *     summary: Definir horarios de atención y duración de slot (solo la Dirección / Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Horario actualizado }
 */
router.put(
  '/:id/horario',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(updateHorarioSchema),
  ctrl.updateHorario,
);

/**
 * @openapi
 * /medicos/{id}/bloqueos:
 *   get:
 *     tags: [Médicos]
 *     summary: Lista de bloqueos del médico
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Bloqueos }
 *   post:
 *     tags: [Médicos]
 *     summary: Crear bloqueo (vacaciones, feriado, etc.) — solo la Dirección / Admin
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Bloqueo creado }
 */
router.get('/:id/bloqueos', authenticate, ctrl.listBloqueos);
router.post(
  '/:id/bloqueos',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(createBloqueoSchema),
  ctrl.createBloqueo,
);

/**
 * @openapi
 * /medicos/{id}/bloqueos/{bloqueoId}:
 *   delete:
 *     tags: [Médicos]
 *     summary: Eliminar un bloqueo (solo la Dirección / Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Bloqueo eliminado }
 */
router.delete(
  '/:id/bloqueos/:bloqueoId',
  authenticate,
  authorize(UserRole.ADMIN),
  ctrl.deleteBloqueo,
);

export default router;
