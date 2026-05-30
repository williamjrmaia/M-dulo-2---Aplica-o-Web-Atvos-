import {
  createParceiro,
  createParceiroTerra,
  getParceiroById,
  listarParceiros,
  listarTerrasDoParceiro,
  updateParceiro,
} from '../repositories/parceiroRepository';
import {
  CreateParceiroInput,
  Parceiro,
  ParceiroTerra,
  TerraDoParceiro,
  UpdateParceiroInput,
  VincularTerraAoParceiroInput,
} from '../models/parceiro';
import { ConflictError, NotFoundError, UnprocessableEntityError } from '../errors/AppError';

export async function cadastrarParceiro(data: CreateParceiroInput): Promise<Parceiro> {
  try {
    return await createParceiro(data);
  } catch (err: unknown) {
    //  indica uma violação de restrição de unicidade
    if ((err as { code?: string }).code === '23505') {
      throw new ConflictError('cpf_cnpj já cadastrado');
    }
    throw err;
  }
}

export async function editarParceiro(id: string, data: UpdateParceiroInput): Promise<Parceiro> {
  try {
    const parceiro = await updateParceiro(id, data);
    if (!parceiro) {
      throw new NotFoundError('Parceiro não encontrado');
    }
    return parceiro;
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ConflictError('cpf_cnpj ou email já cadastrado');
    }
    throw err;
  }
}

export async function obterParceiros(): Promise<Parceiro[]> {
  return await listarParceiros();
}

export async function obterParceiroPorId(id: string): Promise<Parceiro> {
  try {
    const parceiro = await getParceiroById(id);
    if (!parceiro) {
      throw new NotFoundError('Parceiro não encontrado');
    }
    return parceiro;
  } catch (err: any) {
    if (err.code === '22P02') {
      throw new NotFoundError('Parceiro não encontrado');
    }
    throw err;
  }
}

export async function obterTerrasDoParceiro(parceiroId: string): Promise<TerraDoParceiro[]> {
  try {
    const terras = await listarTerrasDoParceiro(parceiroId);
    if (terras === null) {
      throw new NotFoundError('Parceiro não encontrado');
    }
    return terras;
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Parceiro não encontrado');
    }
    throw err;
  }
}

export async function vincularTerraAoParceiro(
  parceiroId: string,
  data: VincularTerraAoParceiroInput
): Promise<ParceiroTerra> {
  try {
    const vinculo = await createParceiroTerra(parceiroId, data);
    if (!vinculo) {
      throw new NotFoundError('Parceiro não encontrado');
    }
    return vinculo;
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Parceiro não encontrado');
    }
    if ((err as { code?: string }).code === '23505') {
      throw new ConflictError('Terra já vinculada ao parceiro');
    }
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('terra_id não referencia uma terra existente');
    }
    throw err;
  }
}
