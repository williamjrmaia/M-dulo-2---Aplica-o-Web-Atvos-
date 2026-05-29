import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import { cadastrarTerra, obterTerras } from '../services/terraService';
import { createTerraSchema } from '../schemas/terra.schema';
import { ValidationError } from '../errors/AppError';

export const createTerra = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createTerraSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const terra = await cadastrarTerra(parsed.data);

  res.status(201).location(`/api/terras/${terra.id}`).json(terra);
});

export const listarTerras = asyncHandler(async (_req: Request, res: Response) => {
  const terras = await obterTerras();
  res.status(200).json(terras);
});
