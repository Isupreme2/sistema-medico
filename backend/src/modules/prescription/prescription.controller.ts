import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './prescription.service';
import { generarPdfReceta } from './prescription.pdf';
import { renderRecetaHtml, renderLinkInvalidoHtml } from './prescription.linkView';

export const emitir = asyncHandler(async (req: Request, res: Response) => {
  const { receta, safety } = await service.emitir(req.user!.sub, req.body);
  res.status(201).json({ status: 'success', data: { receta, safety } });
});

export const listByPatient = asyncHandler(async (req: Request, res: Response) => {
  const recetas = await service.listByPatient(req.params.id, req.user!);
  res.json({ status: 'success', data: { recetas } });
});

export const pdf = asyncHandler(async (req: Request, res: Response) => {
  const receta = await service.getOwned(req.params.id, req.user!);
  await generarPdfReceta(receta, res);
});

export const verificar = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.verificar(req.params.codigo);
  res.json({ status: 'success', data: result });
});

/** Vista pública (HTML) de la receta, abierta desde el enlace del chat. */
export const verLink = asyncHandler(async (req: Request, res: Response) => {
  const receta = await service.verRecetaPorToken(req.params.token);
  res.type('html');
  if (!receta) {
    res.status(404).send(renderLinkInvalidoHtml());
    return;
  }
  res.send(renderRecetaHtml(receta));
});
