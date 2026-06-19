import { Router } from 'express';
import * as ctrl from './record.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import { createRecordSchema } from './record.validation';

const router = Router();

/**
 * @openapi
 * /records:
 *   post:
 *     tags: [Historia clínica]
 *     summary: Crear consulta clínica (Médico)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Consulta creada }
 *       404: { description: Paciente no encontrado }
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.MEDICO),
  validate(createRecordSchema),
  ctrl.createRecord,
);

/**
 * @openapi
 * /records/paciente/{id}:
 *   get:
 *     tags: [Historia clínica]
 *     summary: Historial clínico de un paciente (médico, paciente dueño o admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: userId del paciente
 *     responses:
 *       200: { description: Lista de consultas }
 *       403: { description: Sin permiso }
 */
router.get('/paciente/:id', authenticate, ctrl.listByPatient);

/**
 * @openapi
 * /records/{id}:
 *   get:
 *     tags: [Historia clínica]
 *     summary: Detalle de una consulta
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Consulta }
 *       404: { description: No encontrada }
 */
router.get('/:id', authenticate, ctrl.getById);

export default router;
