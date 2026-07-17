import { Router } from 'express';
import * as ctrl from './aiAnalysis.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../constants/roles';

const router = Router();

/**
 * @openapi
 * /ai-analysis/paciente/{id}:
 *   get:
 *     tags: [Análisis IA]
 *     summary: Análisis clínico asistido por IA (apoyo al médico, no diagnóstico)
 *     description: >
 *       Genera una evaluación probabilística de riesgos a partir de toda la historia
 *       del paciente (motivos de cita, diagnósticos, signos, tratamientos y recetas).
 *       Solo Médico o Admin. No es un diagnóstico médico.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Análisis generado }
 *       403: { description: Solo personal clínico }
 *       404: { description: Paciente no encontrado }
 */
router.get(
  '/paciente/:id',
  authenticate,
  authorize(UserRole.MEDICO, UserRole.ADMIN),
  ctrl.analizar,
);

export default router;
