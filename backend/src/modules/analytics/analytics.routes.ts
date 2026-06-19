import { Router } from 'express';
import * as ctrl from './analytics.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../constants/roles';

const router = Router();

/**
 * @openapi
 * /analytics/overview:
 *   get:
 *     tags: [Analítica]
 *     summary: Métricas del panel administrativo (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Totales, citas por estado, ausentismo, ingresos, top médicos }
 */
router.get('/overview', authenticate, authorize(UserRole.ADMIN), ctrl.overview);

export default router;
