import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './appointmentType.service';

export const listTypes = asyncHandler(async (req: Request, res: Response) => {
  const soloActivos = req.query.activos === 'true';
  const tipos = await service.listTypes(soloActivos);
  res.json({ status: 'success', data: { tipos } });
});

export const createType = asyncHandler(async (req: Request, res: Response) => {
  const tipo = await service.createType(req.body);
  res.status(201).json({ status: 'success', data: { tipo } });
});

export const updateType = asyncHandler(async (req: Request, res: Response) => {
  const tipo = await service.updateType(req.params.id, req.body);
  res.json({ status: 'success', data: { tipo } });
});

export const deleteType = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteType(req.params.id);
  res.json({ status: 'success', message: 'Tipo de cita eliminado' });
});
