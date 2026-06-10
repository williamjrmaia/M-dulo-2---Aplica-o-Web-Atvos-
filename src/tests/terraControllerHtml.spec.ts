import { randomUUID } from 'crypto';
import {
  processarCadastroTerra,
  processarEdicaoTerra,
  processarVinculoTerra,
} from '../controllers/terraController';
import {
  cadastrarTerra,
  editarTerra,
  obterTerraPorId,
  vincularParceiroATerra,
} from '../services/terraService';
import { obterParceiros } from '../services/parceiroService';

jest.mock('../services/terraService', () => ({
  cadastrarTerra: jest.fn().mockResolvedValue({}),
  editarTerra: jest.fn().mockResolvedValue({}),
  obterTerraPorId: jest.fn().mockResolvedValue({ id: 'terra-id', nome: 'Terra Teste' }),
  obterTerras: jest.fn().mockResolvedValue([]),
  vincularParceiroATerra: jest.fn().mockResolvedValue({}),
}));

jest.mock('../services/parceiroService', () => ({
  obterParceiros: jest.fn().mockResolvedValue([]),
}));

function criarResposta() {
  return {
    locals: {},
    redirect: jest.fn(),
    render: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
}

describe('controllers HTML de terras', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cadastra terra usando o usuário autenticado', async () => {
    const usuarioId = randomUUID();
    const req = {
      body: {
        nome: 'Terra Sessão',
        area_contratada_ha: '120.5',
        cidade: 'Ribeirão Preto',
        estado: 'SP',
      },
      usuario: { id: usuarioId },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarCadastroTerra(req as any, res as any, next);

    expect(cadastrarTerra).toHaveBeenCalledWith(expect.objectContaining({ criado_por: usuarioId }));
    expect(res.redirect).toHaveBeenCalledWith('/terras?info=Terra%20cadastrada%20com%20sucesso');
    expect(next).not.toHaveBeenCalled();
  });

  it('edita terra usando o usuário autenticado', async () => {
    const usuarioId = randomUUID();
    const terraId = randomUUID();
    const req = {
      params: { id: terraId },
      body: {
        nome: 'Terra Editada',
        atualizado_por: randomUUID(),
      },
      usuario: { id: usuarioId },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicaoTerra(req as any, res as any, next);

    expect(editarTerra).toHaveBeenCalledWith(
      terraId,
      expect.objectContaining({ nome: 'Terra Editada', atualizado_por: usuarioId })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('vincula parceiro à terra via formulário', async () => {
    const terraId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: terraId },
      body: {
        parceiro_id: parceiroId,
        tipo_vinculo: 'arrendamento',
      },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarVinculoTerra(req as any, res as any, next);

    expect(vincularParceiroATerra).toHaveBeenCalledWith(
      terraId,
      expect.objectContaining({ parceiro_id: parceiroId, tipo_vinculo: 'arrendamento' })
    );
    expect(obterTerraPorId).not.toHaveBeenCalled();
    expect(obterParceiros).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/terras?info=Parceiro%20vinculado%20%C3%A0%20terra%20com%20sucesso');
    expect(next).not.toHaveBeenCalled();
  });
});
