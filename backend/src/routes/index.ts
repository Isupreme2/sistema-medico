import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Sistema]
 *     summary: Healthcheck del API
 *     responses:
 *       200: { description: API operativa }
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sistema-medico-backend',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);

// Aquí se montarán los próximos módulos:
// router.use('/medicos', medicoRoutes);
// router.use('/appointments', appointmentRoutes);
// router.use('/records', recordRoutes);
// router.use('/prescriptions', prescriptionRoutes);

export default router;
