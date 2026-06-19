import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './notification.service';

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const soloNoLeidas = String(req.query.unread ?? '') === 'true';
  const [notificaciones, noLeidas] = await Promise.all([
    service.listMine(req.user!.sub, soloNoLeidas),
    service.unreadCount(req.user!.sub),
  ]);
  res.json({ status: 'success', data: { notificaciones, noLeidas } });
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const noLeidas = await service.unreadCount(req.user!.sub);
  res.json({ status: 'success', data: { noLeidas } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notificacion = await service.markRead(req.params.id, req.user!);
  res.json({ status: 'success', data: { notificacion } });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const actualizadas = await service.markAllRead(req.user!.sub);
  res.json({ status: 'success', data: { actualizadas } });
});
