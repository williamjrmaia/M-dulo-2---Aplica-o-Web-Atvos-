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
  ConsultaTerrasOpcoes,
  ExcluirTerraInput,
  ParceiroDaTerra,
  Terra,
  TerraParceiro,
  UpdateTerraInput,
  VincularParceiroATerraInput,
} from '../models/terra';
import { AppError, ConflictError, NotFoundError, UnprocessableEntityError } from '../errors/AppError';

type TratamentoErroTerra = {
  fkMessage?: string;
  uniqueMessage?: string;
};

const FABRICAS_ERRO_TERRA: Record<string, (t: TratamentoErroTerra) => AppError | undefined> = {
  '22P02': () => new NotFoundError('Terra não encontrada'),
  '23505': (t) => (t.uniqueMessage ? new ConflictError(t.uniqueMessage) : undefined),
  '23503': (t) => (t.fkMessage ? new UnprocessableEntityError(t.fkMessage) : undefined),
};

// Re-lança AppError do domínio e traduz códigos do Postgres (id inválido, FK e
// unicidade) em AppError para os services de terra.
function lancarErroTerraTraduzido(err: unknown, tratamento: TratamentoErroTerra = {}): never {
  if (err instanceof AppError) {
    throw err;
  }
  const code = String((err as { code?: string }).code);
  const fabrica = FABRICAS_ERRO_TERRA[code];
  const erroTraduzido = fabrica ? fabrica(tratamento) : undefined;
  if (erroTraduzido) {
    throw erroTraduzido;
  }
  throw err;
}

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

export async function obterTerras(opcoes: ConsultaTerrasOpcoes = {}): Promise<Terra[]> {
  return listarTerras(opcoes);
}

export async function obterTerraPorId(
  id: string,
  opcoes: ConsultaTerrasOpcoes = {}
): Promise<Terra> {
  try {
    const terra = await getTerraById(id, opcoes);
    if (!terra) {
      throw new NotFoundError('Terra não encontrada');
    }
    return terra;
  } catch (err: unknown) {
    lancarErroTerraTraduzido(err);
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
    lancarErroTerraTraduzido(err, { fkMessage: 'atualizado_por não referencia um usuário existente' });
  }
}

export async function obterParceirosDaTerra(
  terraId: string,
  opcoes: ConsultaTerrasOpcoes = {}
): Promise<ParceiroDaTerra[]> {
  try {
    const parceiros = await listarParceirosDaTerra(terraId, opcoes);
    if (parceiros === null) {
      throw new NotFoundError('Terra não encontrada');
    }
    return parceiros;
  } catch (err: unknown) {
    lancarErroTerraTraduzido(err);
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
    lancarErroTerraTraduzido(err, {
      uniqueMessage: 'Parceiro já vinculado à terra',
      fkMessage: 'parceiro_id não referencia um parceiro existente',
    });
  }
}
