import { Router } from 'express';
import * as ctrl from './patient.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import { registerSchema } from '../auth/auth.validation';

const router = Router();

/**
 * @openapi
 * /patients:
 *   get:
 *     tags: [Pacientes]
 *     summary: Buscar pacientes por nombre/email (Recepción, Médico o Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Texto a buscar en nombre, apellido o email
 *     responses:
 *       200: { description: Lista de pacientes }
 *   post:
 *     tags: [Pacientes]
 *     summary: Registrar un paciente (Recepción o Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Paciente registrado }
 *       409: { description: Email ya registrado }
 */
router.get(
  '/',
  authenticate,
  authorize(UserRole.RECEPCIONISTA, UserRole.ADMIN, UserRole.MEDICO),
  ctrl.buscar,
);
router.post(
  '/',
  authenticate,
  authorize(UserRole.RECEPCIONISTA, UserRole.ADMIN),
  validate(registerSchema),
  ctrl.registrar,
);

export default router;
