import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { UserRole } from "../../constants/roles";
import * as ctrl from "./prediction.controller";
import { getPredictionSchema } from "./prediction.validation";

const router = Router();

/**
 * @openapi
 * /predictions/paciente/{id}:
 *   get:
 *     tags: [Predicciones]
 *     summary: Prediccion de riesgo clinico para un paciente
 *     description: >
 *       Estima la probabilidad de riesgo cardiovascular, metabolico y respiratorio
 *       a partir del historial de consultas del paciente.
 *       No constituye un diagnostico medico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId del paciente
 *     responses:
 *       200:
 *         description: Prediccion generada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     prediction:
 *                       type: object
 *                       properties:
 *                         pacienteId:
 *                           type: string
 *                         generadoEn:
 *                           type: string
 *                           format: date-time
 *                         horizonte:
 *                           type: string
 *                           example: proxima_visita
 *                         estado:
 *                           type: string
 *                           enum: [ok, datos_insuficientes, error_inferencia]
 *                         categorias:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               categoria:
 *                                 type: string
 *                                 enum: [cardiovascular, metabolico, respiratorio]
 *                               probabilidad:
 *                                 type: number
 *                                 format: float
 *                               nivel:
 *                                 type: string
 *                                 enum: [bajo, medio, alto]
 *                               factores:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                         disclaimer:
 *                           type: string
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (solo medico o admin)
 *       404:
 *         description: Paciente no encontrado
 *       "422":
 *         description: ID de paciente invalido
 */
router.get(
  "/paciente/:id",
  authenticate,
  authorize(UserRole.MEDICO, UserRole.ADMIN),
  validate(getPredictionSchema),
  ctrl.getPrediction,
);

export default router;
