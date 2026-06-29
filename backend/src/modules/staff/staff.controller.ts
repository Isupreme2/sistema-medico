import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './staff.service';

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const usuario = await service.createRecepcionista(req.body);
  res.status(201).json({ status: 'success', data: { usuario } });
});

export const listar = asyncHandler(async (_req: Request, res: Response) => {
  const recepcionistas = await service.listRecepcionistas();
  res.json({ status: 'success', data: { recepcionistas } });
});
