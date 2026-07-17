import { Router } from 'express';
import * as ctrl from './toma.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../constants/roles';

const router = Router();

/**
 * @openapi
 * /tomas/proximas:
 *   get:
 *     tags: [Tomas]
 *     summary: Próximas tomas de medicamentos del paciente autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Listado de próximas tomas }
 */
router.get('/proximas', authenticate, authorize(UserRole.PACIENTE), ctrl.proximas);

/**
 * @openapi
 * /tomas/{id}/confirmar:
 *   patch:
 *     tags: [Tomas]
 *     summary: El paciente confirma que tomó su medicamento
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Toma confirmada }
 *       404: { description: Toma no encontrada }
 */
router.patch('/:id/confirmar', authenticate, authorize(UserRole.PACIENTE), ctrl.confirmar);

export default router;
