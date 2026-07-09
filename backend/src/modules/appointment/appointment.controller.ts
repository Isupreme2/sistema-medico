import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { emitSlotChange } from '../../realtime/socket';
import * as service from './appointment.service';
import * as alternativosService from './appointment.alternativos.service';

export const disponibilidad = asyncHandler(async (req: Request, res: Response) => {
  const fecha = String(req.query.fecha ?? '');
  const data = await service.getAvailability(req.params.id, fecha);
  res.json({ status: 'success', data });
});

export const getAlternativos = asyncHandler(async (req: Request, res: Response) => {
  const medicoId = String(req.query.medicoId ?? '');
  const fecha = String(req.query.fecha ?? '');
  const hora = req.query.hora ? String(req.query.hora) : undefined;
  const data = await alternativosService.findAlternatives(medicoId, fecha, hora);
  res.json({ status: 'success', data });
});

export const reservar = asyncHandler(async (req: Request, res: Response) => {
  const cita = await service.reservar(req.user!, req.body);
  emitSlotChange({
    medicoId: cita.medicoId._id.toString(),
    fechaHora: cita.fechaHora.toISOString(),
    estado: cita.estado,
  });
  res.status(201).json({ status: 'success', data: { cita } });
});

export const reservarYPagar = asyncHandler(async (req: Request, res: Response) => {
  const metodoPago = (req.body as { metodoPago?: string }).metodoPago;
  const { cita, factura } = await service.reservarYPagar(req.user!, req.body, metodoPago);
  emitSlotChange({
    medicoId: cita.medicoId._id.toString(),
    fechaHora: cita.fechaHora.toISOString(),
    estado: cita.estado,
  });
  res.status(201).json({ status: 'success', data: { cita, factura } });
});

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const citas = await service.listAppointments(req.user!, {
    desde: req.query.desde as string | undefined,
    hasta: req.query.hasta as string | undefined,
    medicoId: req.query.medicoId as string | undefined,
  });
  res.json({ status: 'success', data: { citas } });
});

export const cancelar = asyncHandler(async (req: Request, res: Response) => {
  const cita = await service.cancelar(req.params.id, req.user!);
  emitSlotChange({
    medicoId: cita.medicoId._id.toString(),
    fechaHora: cita.fechaHora.toISOString(),
    estado: cita.estado,
  });
  res.json({ status: 'success', data: { cita } });
});

export const actualizarEstado = asyncHandler(async (req: Request, res: Response) => {
  const cita = await service.actualizarEstado(req.params.id, req.user!, req.body);
  res.json({ status: 'success', data: { cita } });
});

export const videoAccess = asyncHandler(async (req: Request, res: Response) => {
  const video = await service.getVideoAccess(req.params.id, req.user!);
  res.json({ status: 'success', data: { video } });
});

export const submitPreConsulta = asyncHandler(async (req: Request, res: Response) => {
  const preConsulta = await service.submitPreConsulta(req.params.id, req.user!, req.body);
  res.status(201).json({ status: 'success', data: { preConsulta } });
});

export const getPreConsulta = asyncHandler(async (req: Request, res: Response) => {
  const preConsulta = await service.getPreConsulta(req.params.id, req.user!);
  res.json({ status: 'success', data: { preConsulta } });
});
