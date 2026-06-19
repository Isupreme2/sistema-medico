import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as medicoService from './medico.service';

export const createMedico = asyncHandler(async (req: Request, res: Response) => {
  const medico = await medicoService.createMedico(req.body);
  res.status(201).json({ status: 'success', data: { medico } });
});

export const listMedicos = asyncHandler(async (req: Request, res: Response) => {
  const soloActivos = req.query.activos === 'true';
  const medicos = await medicoService.listMedicos(soloActivos);
  res.json({ status: 'success', data: { medicos } });
});

export const getMedico = asyncHandler(async (req: Request, res: Response) => {
  const medico = await medicoService.getMedicoByUserId(req.params.id);
  res.json({ status: 'success', data: { medico } });
});

export const updateHorario = asyncHandler(async (req: Request, res: Response) => {
  const medico = await medicoService.updateHorario(req.params.id, req.body, req.user!);
  res.json({ status: 'success', data: { medico } });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const medico = await medicoService.updateProfile(req.params.id, req.body, req.user!);
  res.json({ status: 'success', data: { medico } });
});

export const createBloqueo = asyncHandler(async (req: Request, res: Response) => {
  const bloqueo = await medicoService.createBloqueo(req.params.id, req.body, req.user!);
  res.status(201).json({ status: 'success', data: { bloqueo } });
});

export const listBloqueos = asyncHandler(async (req: Request, res: Response) => {
  const bloqueos = await medicoService.listBloqueos(req.params.id);
  res.json({ status: 'success', data: { bloqueos } });
});

export const deleteBloqueo = asyncHandler(async (req: Request, res: Response) => {
  await medicoService.deleteBloqueo(req.params.bloqueoId, req.user!);
  res.json({ status: 'success', message: 'Bloqueo eliminado' });
});
