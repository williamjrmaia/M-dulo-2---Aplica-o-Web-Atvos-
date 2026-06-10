import {
  createTerra,
  createTerraParceiro,
  deactivateTerra,
  getTerraById,
  listarParceirosDaTerra,
  listarTerras,
  updateTerra,
} from '../repositories/terraRepository';
import {
  CreateTerraInput,
  ExcluirTerraInput,
  ParceiroDaTerra,
  Terra,
  TerraParceiro,
  UpdateTerraInput,
  VincularParceiroATerraInput,
} from '../models/terra';
import { ConflictError, NotFoundError, UnprocessableEntityError } from '../errors/AppError';

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

export async function excluirTerra(id: string, data: ExcluirTerraInput): Promise<Terra> {
  try {
    const terraAtual = await getTerraById(id);
    if (!terraAtual) {
      throw new NotFoundError('Terra não encontrada');
    }

    if (terraAtual.status === 'inativo') {
      throw new ConflictError('Terra já está inativa');
    }

    const terra = await deactivateTerra(id, data, terraAtual);
    if (!terra) {
      throw new ConflictError('Terra já está inativa');
    }

    return terra;
  } catch (err: unknown) {
    if (err instanceof NotFoundError || err instanceof ConflictError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Terra não encontrada');
    }
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('atualizado_por não referencia um usuário existente');
    }
    throw err;
  }
}

export async function obterParceirosDaTerra(terraId: string): Promise<ParceiroDaTerra[]> {
  try {
    const parceiros = await listarParceirosDaTerra(terraId);
    if (parceiros === null) {
      throw new NotFoundError('Terra não encontrada');
    }
    return parceiros;
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Terra não encontrada');
    }
    throw err;
  }
}

export async function vincularParceiroATerra(
  terraId: string,
  data: VincularParceiroATerraInput
): Promise<TerraParceiro> {
  try {
    const vinculo = await createTerraParceiro(terraId, data);
    if (!vinculo) {
      throw new NotFoundError('Terra não encontrada');
    }
    return vinculo;
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Terra não encontrada');
    }
    if ((err as { code?: string }).code === '23505') {
      throw new ConflictError('Parceiro já vinculado à terra');
    }
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('parceiro_id não referencia um parceiro existente');
    }
    throw err;
  }
}
