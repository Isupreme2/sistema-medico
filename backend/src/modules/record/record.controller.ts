import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './record.service';

export const createRecord = asyncHandler(async (req: Request, res: Response) => {
  const record = await service.createRecord(req.user!.sub, req.body);
  res.status(201).json({ status: 'success', data: { record } });
});

export const listByPatient = asyncHandler(async (req: Request, res: Response) => {
  const records = await service.listByPatient(req.params.id, req.user!);
  res.json({ status: 'success', data: { records } });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const record = await service.getById(req.params.id, req.user!);
  res.json({ status: 'success', data: { record } });
});
