import { randomUUID } from 'crypto';
import {
  aprovarParceiroViaFormulario,
  devolverParceiroViaFormulario,
  excluirParceiro as excluirParceiroController,
  listarTerrasDoParceiro,
  processarCadastro,
  processarEdicao,
  renderListaParceiros,
} from '../controllers/parceiroController';
import {
  aprovarParceiro,
  cadastrarParceiro,
  devolverParceiro,
  editarParceiro,
  excluirParceiro,
  obterParceiroPorId,
  obterParceiros,
  obterTerrasDoParceiro,
} from '../services/parceiroService';

jest.mock('../services/parceiroService', () => ({
  aprovarParceiro: jest.fn().mockResolvedValue({}),
  cadastrarParceiro: jest.fn().mockResolvedValue({}),
  devolverParceiro: jest.fn().mockResolvedValue({}),
  editarParceiro: jest.fn().mockResolvedValue({}),
  excluirParceiro: jest.fn().mockResolvedValue({}),
  enviarParceiroParaValidacao: jest.fn(),
  obterHistoricoParceiro: jest.fn(),
  obterParceiroPorId: jest.fn().mockResolvedValue({ status: 'rascunho' }),
  obterParceiros: jest.fn().mockResolvedValue([]),
  obterTerrasDoParceiro: jest.fn(),
  vincularTerraAoParceiro: jest.fn(),
}));

function criarResposta() {
  return {
    json: jest.fn(),
    redirect: jest.fn(),
    render: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
}

describe('controllers HTML de parceiros usam usuário autenticado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('usa req.usuario.id como criado_por no cadastro', async () => {
    const usuarioId = randomUUID();
    const req = {
      body: {
        nome: 'Parceiro Sessão',
        tipo_pessoa: 'fisica',
        cpf_cnpj: '12345678901',
      },
      usuario: { id: usuarioId },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarCadastro(req as any, res as any, next);

    expect(cadastrarParceiro).toHaveBeenCalledWith(expect.objectContaining({ criado_por: usuarioId }));
    expect(next).not.toHaveBeenCalled();
  });

  it('usa req.usuario.id como atualizado_por na edição', async () => {
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { nome: 'Parceiro Editado' },
      usuario: { id: usuarioId },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicao(req as any, res as any, next);

    expect(editarParceiro).toHaveBeenCalledWith(
      parceiroId,
      expect.objectContaining({ nome: 'Parceiro Editado', atualizado_por: usuarioId })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('bloqueia analista ao alterar status fora de rascunho para pendente', async () => {
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { status: 'ativo' },
      usuario: { id: usuarioId, perfil: 'analista' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicao(req as any, res as any, next);

    expect(obterParceiroPorId).toHaveBeenCalledWith(parceiroId, {
      incluirInativos: false,
      rascunhosUsuarioId: usuarioId,
    });
    expect(editarParceiro).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      'parceiros/edit',
      expect.objectContaining({
        error: 'Analista só pode enviar rascunhos ou devolvidos para validação',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('permite analista enviar rascunho de parceiro para pendente', async () => {
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { status: 'pendente' },
      usuario: { id: usuarioId, perfil: 'analista' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicao(req as any, res as any, next);

    expect(editarParceiro).toHaveBeenCalledWith(
      parceiroId,
      expect.objectContaining({ status: 'pendente', atualizado_por: usuarioId })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('permite analista reenviar parceiro devolvido para pendente', async () => {
    (obterParceiroPorId as jest.Mock).mockResolvedValueOnce({ status: 'devolvido' });
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { status: 'pendente' },
      usuario: { id: usuarioId, perfil: 'analista' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicao(req as any, res as any, next);

    expect(editarParceiro).toHaveBeenCalledWith(
      parceiroId,
      expect.objectContaining({ status: 'pendente', atualizado_por: usuarioId })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('bloqueia coordenador ao tentar inativar parceiro', async () => {
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { atualizado_por: usuarioId },
      usuario: { id: usuarioId, perfil: 'coordenador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await excluirParceiroController(req as any, res as any, next);

    expect(excluirParceiro).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Coordenador não pode inativar registros',
      })
    );
  });

  it('permite coordenador editar parceiro sem inativar', async () => {
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { nome: 'Parceiro Revisado' },
      usuario: { id: usuarioId, perfil: 'coordenador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicao(req as any, res as any, next);

    expect(editarParceiro).toHaveBeenCalledWith(
      parceiroId,
      expect.objectContaining({ nome: 'Parceiro Revisado', atualizado_por: usuarioId })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('bloqueia coordenador ao alterar status de parceiro para inativo na edição', async () => {
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { status: 'inativo' },
      usuario: { id: usuarioId, perfil: 'coordenador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await processarEdicao(req as any, res as any, next);

    expect(editarParceiro).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith(
      'parceiros/edit',
      expect.objectContaining({
        error: 'Coordenador não pode inativar registros',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('lista parceiros incluindo inativos para administrador', async () => {
    const usuarioId = randomUUID();
    const req = {
      query: {},
      usuario: { id: usuarioId, perfil: 'administrador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await renderListaParceiros(req as any, res as any, next);

    expect(obterParceiros).toHaveBeenCalledWith({}, { incluirInativos: true, rascunhosUsuarioId: usuarioId });
    expect(res.render).toHaveBeenCalledWith('parceiros/index', expect.objectContaining({ parceiros: [] }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lista parceiros ocultando inativos para coordenador', async () => {
    const usuarioId = randomUUID();
    const req = {
      query: {},
      usuario: { id: usuarioId, perfil: 'coordenador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await renderListaParceiros(req as any, res as any, next);

    expect(obterParceiros).toHaveBeenCalledWith({}, { incluirInativos: false, rascunhosUsuarioId: usuarioId });
    expect(res.render).toHaveBeenCalledWith('parceiros/index', expect.objectContaining({ parceiros: [] }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lista terras vinculadas incluindo inativas para administrador', async () => {
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      usuario: { id: randomUUID(), perfil: 'administrador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await listarTerrasDoParceiro(req as any, res as any, next);

    expect(obterTerrasDoParceiro).toHaveBeenCalledWith(parceiroId, { incluirInativos: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('lista terras vinculadas ocultando inativas para coordenador', async () => {
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      usuario: { id: randomUUID(), perfil: 'coordenador' },
    };
    const res = criarResposta();
    const next = jest.fn();

    await listarTerrasDoParceiro(req as any, res as any, next);

    expect(obterTerrasDoParceiro).toHaveBeenCalledWith(parceiroId, { incluirInativos: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('usa req.usuario.id como aprovado_por na aprovação via formulário', async () => {
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { comentario: 'Cadastro conferido' },
      usuario: { id: usuarioId },
    };
    const res = criarResposta();
    const next = jest.fn();

    await aprovarParceiroViaFormulario(req as any, res as any, next);

    expect(aprovarParceiro).toHaveBeenCalledWith(
      parceiroId,
      expect.objectContaining({ aprovado_por: usuarioId, comentario: 'Cadastro conferido' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('usa req.usuario.id como devolvido_por na devolução via formulário', async () => {
    const usuarioId = randomUUID();
    const parceiroId = randomUUID();
    const req = {
      params: { id: parceiroId },
      body: { comentario: 'Ajustar documentação' },
      usuario: { id: usuarioId },
    };
    const res = criarResposta();
    const next = jest.fn();

    await devolverParceiroViaFormulario(req as any, res as any, next);

    expect(devolverParceiro).toHaveBeenCalledWith(
      parceiroId,
      expect.objectContaining({ devolvido_por: usuarioId, comentario: 'Ajustar documentação' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
