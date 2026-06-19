import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './analytics.service';

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.overview();
  res.json({ status: 'success', data });
});
