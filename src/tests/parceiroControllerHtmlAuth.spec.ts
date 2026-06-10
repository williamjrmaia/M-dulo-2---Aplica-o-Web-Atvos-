import { randomUUID } from 'crypto';
import {
  aprovarParceiroViaFormulario,
  devolverParceiroViaFormulario,
  processarCadastro,
  processarEdicao,
} from '../controllers/parceiroController';
import {
  aprovarParceiro,
  cadastrarParceiro,
  devolverParceiro,
  editarParceiro,
} from '../services/parceiroService';

jest.mock('../services/parceiroService', () => ({
  aprovarParceiro: jest.fn().mockResolvedValue({}),
  cadastrarParceiro: jest.fn().mockResolvedValue({}),
  devolverParceiro: jest.fn().mockResolvedValue({}),
  editarParceiro: jest.fn().mockResolvedValue({}),
  enviarParceiroParaValidacao: jest.fn(),
  obterHistoricoParceiro: jest.fn(),
  obterParceiroPorId: jest.fn(),
  obterParceiros: jest.fn(),
  obterTerrasDoParceiro: jest.fn(),
  vincularTerraAoParceiro: jest.fn(),
}));

function criarResposta() {
  return {
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
