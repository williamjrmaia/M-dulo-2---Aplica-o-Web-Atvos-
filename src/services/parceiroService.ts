import { createParceiro } from '../repositories/parceiroRepository';
import { CreateParceiroInput, Parceiro } from '../models/parceiro';
import { ConflictError } from '../errors/AppError';

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
