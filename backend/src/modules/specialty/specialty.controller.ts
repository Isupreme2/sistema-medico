import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './specialty.service';

export const listSpecialties = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const especialidades = await service.listSpecialties(q);
  res.json({ status: 'success', data: { especialidades } });
});

/** Público: especialidades con al menos un médico activo (sitio de marketing). */
export const listSpecialtiesPublicas = asyncHandler(async (_req: Request, res: Response) => {
  const especialidades = await service.listSpecialtiesConMedicos();
  res.json({ status: 'success', data: { especialidades } });
});
