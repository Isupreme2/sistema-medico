import { Router } from 'express';
import * as ctrl from './appointmentType.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import { createTypeSchema, updateTypeSchema } from './appointmentType.validation';

const router = Router();

/**
 * @openapi
 * /appointment-types:
 *   get:
 *     tags: [Tipos de cita]
 *     summary: Lista de tipos de cita
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Listado }
 *   post:
 *     tags: [Tipos de cita]
 *     summary: Crear tipo de cita (solo Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 */
router.get('/', authenticate, ctrl.listTypes);
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(createTypeSchema),
  ctrl.createType,
);

/**
 * @openapi
 * /appointment-types/{id}:
 *   patch:
 *     tags: [Tipos de cita]
 *     summary: Actualizar tipo de cita (solo Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Tipos de cita]
 *     summary: Eliminar tipo de cita (solo Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Eliminado }
 */
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(updateTypeSchema),
  ctrl.updateType,
);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), ctrl.deleteType);

export default router;
