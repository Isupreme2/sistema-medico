import { Router } from 'express';
import * as ctrl from './staff.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import { createStaffSchema } from './staff.validation';

const router = Router();

/**
 * @openapi
 * /staff:
 *   get:
 *     tags: [Personal]
 *     summary: Lista las cuentas de recepción (solo Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Listado }
 *   post:
 *     tags: [Personal]
 *     summary: Crear una cuenta de Recepción / Registrador (solo Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Cuenta creada }
 *       409: { description: Email ya registrado }
 */
router.get('/', authenticate, authorize(UserRole.ADMIN), ctrl.listar);
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(createStaffSchema),
  ctrl.crear,
);

export default router;
