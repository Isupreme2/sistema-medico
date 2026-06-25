import { Router } from 'express';
import * as ctrl from './specialty.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

/**
 * @openapi
 * /especialidades:
 *   get:
 *     tags: [Especialidades]
 *     summary: Catálogo de especialidades médicas (para el selector al crear médicos)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Filtro opcional por nombre
 *     responses:
 *       200: { description: Listado de especialidades }
 */
router.get('/', authenticate, ctrl.listSpecialties);

export default router;
