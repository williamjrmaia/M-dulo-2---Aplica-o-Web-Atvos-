import { createParceiro, updateParceiro, listarParceiros, getParceiroById } from '../repositories/parceiroRepository';
import { CreateParceiroInput, Parceiro, UpdateParceiroInput } from '../models/parceiro';
import { ConflictError, NotFoundError } from '../errors/AppError';

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
