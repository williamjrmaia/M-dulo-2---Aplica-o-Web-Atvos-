import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import { obterParceiroPorId } from '../services/parceiroService';
import { NotFoundError } from '../errors/AppError';

export const renderDetalheParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const parceiro = await obterParceiroPorId(id);
    res.render('parceiros/detalhe', { parceiro, naoEncontrado: false });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).render('parceiros/detalhe', { parceiro: null, naoEncontrado: true });
      return;
    }
    throw err;
  }
});
