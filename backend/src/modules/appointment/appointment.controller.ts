import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { emitSlotChange } from '../../realtime/socket';
import * as service from './appointment.service';

export const disponibilidad = asyncHandler(async (req: Request, res: Response) => {
  const fecha = String(req.query.fecha ?? '');
  const data = await service.getAvailability(req.params.id, fecha);
  res.json({ status: 'success', data });
});

export const reservar = asyncHandler(async (req: Request, res: Response) => {
  const cita = await service.reservar(req.user!.sub, req.body);
  emitSlotChange({
    medicoId: cita.medicoId._id.toString(),
    fechaHora: cita.fechaHora.toISOString(),
    estado: cita.estado,
  });
  res.status(201).json({ status: 'success', data: { cita } });
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
    medicoId: cita.medicoId.toString(),
    fechaHora: cita.fechaHora.toISOString(),
    estado: cita.estado,
  });
  res.json({ status: 'success', data: { cita } });
});

export const actualizarEstado = asyncHandler(async (req: Request, res: Response) => {
  const cita = await service.actualizarEstado(req.params.id, req.user!, req.body);
  res.json({ status: 'success', data: { cita } });
});
