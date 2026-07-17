import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './aiAnalysis.service';

export const analizar = asyncHandler(async (req: Request, res: Response) => {
  const analysis = await service.analizarPaciente(req.params.id, req.user!);
  res.json({ status: 'success', data: { analysis } });
});
