import { randomUUID } from 'crypto';
import {
  excluirTerra as excluirTerraController,
  processarCadastroTerra,
  processarEdicaoTerra,
  processarVinculoTerra,
} from '../controllers/terraController';
import {
  cadastrarTerra,
  editarTerra,
  excluirTerra,
  obterTerraPorId,
  vincularParceiroATerra,
} from '../services/terraService';
import { obterParceiros } from '../services/parceiroService';

jest.mock('../services/terraService', () => ({
  cadastrarTerra: jest.fn().mockResolvedValue({}),
  editarTerra: jest.fn().mockResolvedValue({}),
  excluirTerra: jest.fn().mockResolvedValue({}),
  obterTerraPorId: jest.fn().mockResolvedValue({ id: 'terra-id', nome: 'Terra Teste', status: 'rascunho' }),
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

  it('bloqueia analista ao alterar status de terra fora de rascunho para pendente', async () => {
    const usuarioId = randomUUID();
    const terraId = randomUUID();
    const req = {
      params: { id: terraId },
      body: {
        status: 'ativo',
      },
      usuario: { id: usuarioId, perfil: 'analista' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicaoTerra(req as any, res as any, next);

    expect(obterTerraPorId).toHaveBeenCalledWith(terraId);
    expect(editarTerra).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      'terras/edit',
      expect.objectContaining({
        error: 'Analista só pode enviar rascunhos ou devolvidos para validação',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('permite analista enviar rascunho de terra para pendente', async () => {
    const usuarioId = randomUUID();
    const terraId = randomUUID();
    const req = {
      params: { id: terraId },
      body: {
        status: 'pendente',
      },
      usuario: { id: usuarioId, perfil: 'analista' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicaoTerra(req as any, res as any, next);

    expect(editarTerra).toHaveBeenCalledWith(
      terraId,
      expect.objectContaining({ status: 'pendente', atualizado_por: usuarioId })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('permite analista reenviar terra devolvida para pendente', async () => {
    (obterTerraPorId as jest.Mock).mockResolvedValueOnce({
      id: 'terra-id',
      nome: 'Terra Teste',
      status: 'devolvido',
    });
    const usuarioId = randomUUID();
    const terraId = randomUUID();
    const req = {
      params: { id: terraId },
      body: {
        status: 'pendente',
      },
      usuario: { id: usuarioId, perfil: 'analista' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicaoTerra(req as any, res as any, next);

    expect(editarTerra).toHaveBeenCalledWith(
      terraId,
      expect.objectContaining({ status: 'pendente', atualizado_por: usuarioId })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('bloqueia coordenador ao tentar inativar terra', async () => {
    const usuarioId = randomUUID();
    const terraId = randomUUID();
    const req = {
      params: { id: terraId },
      body: { atualizado_por: usuarioId },
      usuario: { id: usuarioId, perfil: 'coordenador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await excluirTerraController(req as any, res as any, next);

    expect(excluirTerra).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Coordenador não pode inativar registros',
      })
    );
  });

  it('permite coordenador editar terra sem inativar', async () => {
    const usuarioId = randomUUID();
    const terraId = randomUUID();
    const req = {
      params: { id: terraId },
      body: {
        nome: 'Terra Revisada',
      },
      usuario: { id: usuarioId, perfil: 'coordenador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicaoTerra(req as any, res as any, next);

    expect(editarTerra).toHaveBeenCalledWith(
      terraId,
      expect.objectContaining({ nome: 'Terra Revisada', atualizado_por: usuarioId })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('bloqueia coordenador ao alterar status de terra para inativo na edição', async () => {
    const usuarioId = randomUUID();
    const terraId = randomUUID();
    const req = {
      params: { id: terraId },
      body: {
        status: 'inativo',
      },
      usuario: { id: usuarioId, perfil: 'coordenador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicaoTerra(req as any, res as any, next);

    expect(editarTerra).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith(
      'terras/edit',
      expect.objectContaining({
        error: 'Coordenador não pode inativar registros',
      })
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
