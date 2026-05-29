import { createTerra, updateTerra } from '../repositories/terraRepository';
import { CreateTerraInput, Terra, UpdateTerraInput } from '../models/terra';
import { NotFoundError, UnprocessableEntityError } from '../errors/AppError';

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

export async function editarTerra(id: string, data: UpdateTerraInput): Promise<Terra> {
  try {
    const terra = await updateTerra(id, data);
    if (!terra) {
      throw new NotFoundError('Terra não encontrada');
    }
    return terra;
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    // 23503 = foreign_key_violation: atualizado_por não existe em usuarios
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('atualizado_por não referencia um usuário existente');
    }
    throw err;
  }
}
