import { Router } from 'express';
import * as ctrl from './audit.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../constants/roles';

const router = Router();

/**
 * @openapi
 * /audit:
 *   get:
 *     tags: [Auditoría]
 *     summary: Bitácora de acciones que modifican datos (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: method
 *         schema: { type: string, example: POST }
 *       - in: query
 *         name: role
 *         schema: { type: string, example: medico }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Eventos paginados }
 */
router.get('/', authenticate, authorize(UserRole.ADMIN), ctrl.listAudit);

export default router;
