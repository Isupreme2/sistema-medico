import { Router } from 'express';
import * as ctrl from './invoice.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../constants/roles';
import { createInvoiceSchema } from './invoice.validation';

const router = Router();

/**
 * @openapi
 * /invoices:
 *   get:
 *     tags: [Facturación]
 *     summary: Listar facturas (filtradas por rol)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Facturas }
 *   post:
 *     tags: [Facturación]
 *     summary: Emitir factura (Médico de la cita o Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Factura emitida }
 *       403: { description: Sin permiso }
 */
router.get('/', authenticate, ctrl.listar);
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.RECEPCIONISTA),
  validate(createInvoiceSchema),
  ctrl.crear,
);

/**
 * @openapi
 * /invoices/pagar-cita/{citaId}:
 *   post:
 *     tags: [Facturación]
 *     summary: Pago en línea de una consulta por el paciente (pasarela simulada). Crea la factura pagada.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Factura pagada generada }
 */
router.post(
  '/pagar-cita/:citaId',
  authenticate,
  authorize(UserRole.PACIENTE),
  ctrl.pagarCita,
);

/**
 * @openapi
 * /invoices/{id}:
 *   get:
 *     tags: [Facturación]
 *     summary: Detalle de una factura (dueño, médico o admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Factura }
 */
router.get('/:id', authenticate, ctrl.getById);

/**
 * @openapi
 * /invoices/{id}/pdf:
 *   get:
 *     tags: [Facturación]
 *     summary: Descargar la factura en PDF (dueño, médico o admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: PDF de la factura, content: { application/pdf: {} } }
 */
router.get('/:id/pdf', authenticate, ctrl.pdf);

/**
 * @openapi
 * /invoices/{id}/pay:
 *   patch:
 *     tags: [Facturación]
 *     summary: Marcar factura como pagada (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Factura pagada }
 */
router.patch(
  '/:id/pay',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.RECEPCIONISTA),
  ctrl.marcarPagada,
);

/**
 * @openapi
 * /invoices/{id}/void:
 *   patch:
 *     tags: [Facturación]
 *     summary: Anular factura (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Factura anulada }
 */
router.patch('/:id/void', authenticate, authorize(UserRole.ADMIN), ctrl.anular);

/**
 * @openapi
 * /invoices/{id}/refund:
 *   patch:
 *     tags: [Facturación]
 *     summary: Reembolsar una factura pagada (Admin/Recepción)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Factura reembolsada }
 */
router.patch(
  '/:id/refund',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.RECEPCIONISTA),
  ctrl.reembolsar,
);

/**
 * @openapi
 * /invoices/reembolsar-cita/{citaId}:
 *   post:
 *     tags: [Facturación]
 *     summary: El paciente solicita el reembolso de una cita no realizada
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reembolso procesado }
 */
router.post(
  '/reembolsar-cita/:citaId',
  authenticate,
  authorize(UserRole.PACIENTE),
  ctrl.reembolsarPorCita,
);

export default router;
