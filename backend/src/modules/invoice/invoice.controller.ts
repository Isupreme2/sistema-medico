import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './invoice.service';
import { generarPdfFactura } from './invoice.pdf';

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const factura = await service.crear(req.user!, req.body);
  res.status(201).json({ status: 'success', data: { factura } });
});

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const facturas = await service.list(req.user!);
  res.json({ status: 'success', data: { facturas } });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const factura = await service.getById(req.params.id, req.user!);
  res.json({ status: 'success', data: { factura } });
});

export const pdf = asyncHandler(async (req: Request, res: Response) => {
  const factura = await service.getById(req.params.id, req.user!);
  generarPdfFactura(factura, res);
});

export const pagarCita = asyncHandler(async (req: Request, res: Response) => {
  const factura = await service.pagarCita(req.user!, req.params.citaId);
  res.status(201).json({ status: 'success', data: { factura } });
});

export const marcarPagada = asyncHandler(async (req: Request, res: Response) => {
  const factura = await service.marcarPagada(req.params.id);
  res.json({ status: 'success', data: { factura } });
});

export const anular = asyncHandler(async (req: Request, res: Response) => {
  const factura = await service.anular(req.params.id);
  res.json({ status: 'success', data: { factura } });
});
