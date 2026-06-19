import { Router } from 'express';
import * as ctrl from './prescription.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import { emitirSchema } from './prescription.validation';

const router = Router();

/**
 * @openapi
 * /prescriptions/verify/{codigo}:
 *   get:
 *     tags: [Recetas]
 *     summary: Verificación pública de autenticidad (sin login)
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema: { type: string, example: "RX-2026-A3F9K2" }
 *     responses:
 *       200: { description: Resultado de verificación }
 */
router.get('/verify/:codigo', ctrl.verificar); // PÚBLICO

/**
 * @openapi
 * /prescriptions:
 *   post:
 *     tags: [Recetas]
 *     summary: Emitir receta (Médico) — incluye alerta de alergias/interacciones
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Receta emitida }
 *       422: { description: Alertas de seguridad (requiere confirmar) }
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.MEDICO),
  validate(emitirSchema),
  ctrl.emitir,
);

/**
 * @openapi
 * /prescriptions/paciente/{id}:
 *   get:
 *     tags: [Recetas]
 *     summary: Recetas de un paciente (médico, paciente dueño o admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Listado }
 */
router.get('/paciente/:id', authenticate, ctrl.listByPatient);

/**
 * @openapi
 * /prescriptions/{id}/pdf:
 *   get:
 *     tags: [Recetas]
 *     summary: Descargar la receta en PDF (médico, paciente dueño o admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: PDF de la receta, content: { application/pdf: {} } }
 */
router.get('/:id/pdf', authenticate, ctrl.pdf);

export default router;
