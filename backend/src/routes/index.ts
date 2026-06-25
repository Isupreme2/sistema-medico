import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import medicoRoutes from '../modules/medico/medico.routes';
import specialtyRoutes from '../modules/specialty/specialty.routes';
import appointmentTypeRoutes from '../modules/appointmentType/appointmentType.routes';
import appointmentRoutes from '../modules/appointment/appointment.routes';
import patientRoutes from '../modules/patient/patient.routes';
import recordRoutes from '../modules/record/record.routes';
import prescriptionRoutes from '../modules/prescription/prescription.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import invoiceRoutes from '../modules/invoice/invoice.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import auditRoutes from '../modules/audit/audit.routes';

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
router.use('/medicos', medicoRoutes);
router.use('/especialidades', specialtyRoutes);
router.use('/appointment-types', appointmentTypeRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/patients', patientRoutes);
router.use('/records', recordRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit', auditRoutes);

export default router;
