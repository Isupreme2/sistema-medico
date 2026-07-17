import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './toma.service';

export const proximas = asyncHandler(async (req: Request, res: Response) => {
  const tomas = await service.listProximas(req.user!.sub);
  res.json({ status: 'success', data: { tomas } });
});

export const confirmar = asyncHandler(async (req: Request, res: Response) => {
  const toma = await service.confirmarToma(req.params.id, req.user!);
  res.json({ status: 'success', data: { toma } });
});
