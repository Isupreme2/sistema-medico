import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './patient.service';

export const buscar = asyncHandler(async (req: Request, res: Response) => {
  const pacientes = await service.search(req.query.q as string | undefined);
  res.json({ status: 'success', data: { pacientes } });
});

export const registrar = asyncHandler(async (req: Request, res: Response) => {
  const paciente = await service.create(req.body);
  res.status(201).json({ status: 'success', data: { paciente } });
});
