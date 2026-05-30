import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import {
  cadastrarTerra,
  editarTerra,
  obterParceirosDaTerra,
  obterTerras,
  vincularParceiroATerra as vincularParceiroATerraService,
} from '../services/terraService';
import { createTerraSchema, updateTerraSchema } from '../schemas/terra.schema';
import { vincularParceiroATerraSchema } from '../schemas/terraParceiro.schema';
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

export const updateTerra = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateTerraSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const terra = await editarTerra(id, parsed.data);

  res.status(200).json(terra);
});

export const listarParceirosDaTerra = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parceiros = await obterParceirosDaTerra(id);
  res.status(200).json(parceiros);
});

export const vincularParceiroATerra = asyncHandler(async (req: Request, res: Response) => {
  const parsed = vincularParceiroATerraSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const vinculo = await vincularParceiroATerraService(id, parsed.data);

  res.status(201).location(`/api/terras/${id}/parceiros/${vinculo.parceiro_id}`).json(vinculo);
});
