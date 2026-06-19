import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './audit.service';

export const listAudit = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.listAudit({
    method: req.query.method as string | undefined,
    role: req.query.role as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json({ status: 'success', data });
});
