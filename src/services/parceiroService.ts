import {
  approveParceiro,
  createParceiro,
  createParceiroTerra,
  deactivateParceiro,
  getParceiroById,
  listarHistoricoParceiro,
  listarParceiros,
  listarRascunhosDevolvidosDoAnalista,
  listarTerrasDoParceiro,
  returnParceiroForAdjustment,
  sendParceiroToValidation,
  updateParceiro,
} from '../repositories/parceiroRepository';
import {
  AprovarParceiroInput,
  CreateParceiroInput,
  DevolverParceiroInput,
  EnviarParceiroValidacaoInput,
  ExcluirParceiroInput,
  HistoricoParceiro,
  ListarParceirosFiltros,
  Parceiro,
  ParceiroRascunhoDevolvido,
  ParceiroTerra,
  TerraDoParceiro,
  UpdateParceiroInput,
  VincularTerraAoParceiroInput,
} from '../models/parceiro';
import { ConflictError, NotFoundError, UnprocessableEntityError, ValidationError } from '../errors/AppError';

function validarCamposObrigatoriosParaValidacao(parceiro: Parceiro): void {
  const camposAusentes: string[] = [];

  if (!parceiro.email?.trim()) {
    camposAusentes.push('email');
  }

  if (camposAusentes.length > 0) {
    throw new ValidationError(`Campos obrigatórios para envio à validação: ${camposAusentes.join(', ')}`);
  }
}

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

export async function obterParceiros(filtros: ListarParceirosFiltros = {}): Promise<Parceiro[]> {
  return await listarParceiros(filtros);
}

export async function obterRascunhosDevolvidosDoAnalista(
  analistaId: string
): Promise<ParceiroRascunhoDevolvido[]> {
  if (!analistaId) {
    throw new ValidationError('Analista logado não identificado');
  }

  return listarRascunhosDevolvidosDoAnalista(analistaId);
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

export async function obterHistoricoParceiro(parceiroId: string): Promise<HistoricoParceiro[]> {
  try {
    const historico = await listarHistoricoParceiro(parceiroId);
    if (historico === null) {
      throw new NotFoundError('Parceiro não encontrado');
    }
    return historico;
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

export async function enviarParceiroParaValidacao(
  id: string,
  data: EnviarParceiroValidacaoInput
): Promise<Parceiro> {
  try {
    const parceiroAtual = await getParceiroById(id);
    if (!parceiroAtual) {
      throw new NotFoundError('Parceiro não encontrado');
    }

    if (!['rascunho', 'devolvido'].includes(parceiroAtual.status)) {
      throw new ConflictError('Parceiro só pode ser enviado para validação quando estiver em rascunho ou devolvido');
    }

    validarCamposObrigatoriosParaValidacao(parceiroAtual);

    const parceiro = await sendParceiroToValidation(id, data, parceiroAtual);
    if (!parceiro) {
      throw new ConflictError('Parceiro só pode ser enviado para validação quando estiver em rascunho ou devolvido');
    }

    return parceiro;
  } catch (err: unknown) {
    if (err instanceof NotFoundError || err instanceof ConflictError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Parceiro não encontrado');
    }
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('atualizado_por não referencia um usuário existente');
    }
    throw err;
  }
}

export async function aprovarParceiro(id: string, data: AprovarParceiroInput): Promise<Parceiro> {
  try {
    const parceiroAtual = await getParceiroById(id);
    if (!parceiroAtual) {
      throw new NotFoundError('Parceiro não encontrado');
    }

    if (parceiroAtual.status !== 'pendente') {
      throw new ConflictError('Parceiro só pode ser aprovado quando estiver pendente');
    }

    const parceiro = await approveParceiro(id, data, parceiroAtual);
    if (!parceiro) {
      throw new ConflictError('Parceiro só pode ser aprovado quando estiver pendente');
    }

    return parceiro;
  } catch (err: unknown) {
    if (err instanceof NotFoundError || err instanceof ConflictError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Parceiro não encontrado');
    }
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('aprovado_por não referencia um usuário existente');
    }
    throw err;
  }
}

export async function devolverParceiro(id: string, data: DevolverParceiroInput): Promise<Parceiro> {
  try {
    const parceiroAtual = await getParceiroById(id);
    if (!parceiroAtual) {
      throw new NotFoundError('Parceiro não encontrado');
    }

    if (parceiroAtual.status !== 'pendente') {
      throw new ConflictError('Parceiro só pode ser devolvido quando estiver pendente');
    }

    const parceiro = await returnParceiroForAdjustment(id, data, parceiroAtual);
    if (!parceiro) {
      throw new ConflictError('Parceiro só pode ser devolvido quando estiver pendente');
    }

    return parceiro;
  } catch (err: unknown) {
    if (err instanceof NotFoundError || err instanceof ConflictError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Parceiro não encontrado');
    }
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('devolvido_por não referencia um usuário existente');
    }
    throw err;
  }
}

export async function excluirParceiro(id: string, data: ExcluirParceiroInput): Promise<Parceiro> {
  try {
    const parceiroAtual = await getParceiroById(id);
    if (!parceiroAtual) {
      throw new NotFoundError('Parceiro não encontrado');
    }

    if (parceiroAtual.status === 'inativo') {
      throw new ConflictError('Parceiro já está inativo');
    }

    const parceiro = await deactivateParceiro(id, data, parceiroAtual);
    if (!parceiro) {
      throw new ConflictError('Parceiro já está inativo');
    }

    return parceiro;
  } catch (err: unknown) {
    if (err instanceof NotFoundError || err instanceof ConflictError) {
      throw err;
    }
    if ((err as { code?: string }).code === '22P02') {
      throw new NotFoundError('Parceiro não encontrado');
    }
    if ((err as { code?: string }).code === '23503') {
      throw new UnprocessableEntityError('atualizado_por não referencia um usuário existente');
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
