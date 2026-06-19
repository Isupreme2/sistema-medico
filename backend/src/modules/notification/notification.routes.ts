import { Router } from 'express';
import * as ctrl from './notification.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Mis notificaciones (recientes primero) + contador no leídas
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema: { type: boolean }
 *         description: Si es true, solo devuelve las no leídas
 *     responses:
 *       200: { description: Lista de notificaciones }
 */
router.get('/', authenticate, ctrl.listMine);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Cantidad de notificaciones no leídas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Contador }
 */
router.get('/unread-count', authenticate, ctrl.unreadCount);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notificaciones]
 *     summary: Marcar todas como leídas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Número de notificaciones actualizadas }
 */
router.patch('/read-all', authenticate, ctrl.markAllRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notificaciones]
 *     summary: Marcar una notificación como leída
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Notificación actualizada }
 *       403: { description: Sin permiso }
 *       404: { description: No encontrada }
 */
router.patch('/:id/read', authenticate, ctrl.markRead);

export default router;
