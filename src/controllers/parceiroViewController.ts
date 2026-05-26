import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import { obterParceiros } from '../services/parceiroService';

export const renderListaParceiros = asyncHandler(async (_req: Request, res: Response) => {
  const parceiros = await obterParceiros();
  res.render('parceiros/lista', { parceiros });
});
