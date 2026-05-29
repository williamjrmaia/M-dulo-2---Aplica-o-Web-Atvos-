import { createTerra, listarTerras } from '../repositories/terraRepository';
import { CreateTerraInput, Terra } from '../models/terra';
import { UnprocessableEntityError } from '../errors/AppError';

export async function cadastrarTerra(data: CreateTerraInput): Promise<Terra> {
  try {
    return await createTerra(data);
  } catch (err: unknown) {
    // 23503 = foreign_key_violation: criado_por não existe em usuarios
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('criado_por não referencia um usuário existente');
    }
    throw err;
  }
}

export async function obterTerras(): Promise<Terra[]> {
  return listarTerras();
}
