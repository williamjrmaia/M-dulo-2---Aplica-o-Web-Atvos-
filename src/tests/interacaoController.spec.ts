import { InteracaoController } from '../controllers/interacaoController';
import { InteracaoService } from '../services/interacaoService';
import { Interacao } from '../models/interacao.model';
import { Request, Response } from 'express';

// Mock de Response encadeavel: captura status/json sem subir servidor nem banco.
function criarRes() {
  const status = jest.fn();
  const json = jest.fn();
  const res = { status, json } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, status, json };
}

function serviceStub(impl: Partial<InteracaoService>): InteracaoService {
  return impl as unknown as InteracaoService;
}

function reqStub(id: unknown, body: unknown): Request {
  return { params: { id }, body } as unknown as Request;
}

const BODY_VALIDO = {
  registrado_por: '11111111-1111-1111-1111-111111111111',
  tipo: 'ligacao',
  descricao: 'Contato inicial com o parceiro',
  data: '2026-01-15',
};

describe('InteracaoController.registrar (unitário, com mock de service)', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
  });

  // Caminho de sucesso → 201 com a interação criada.
  it('responde 201 com a interação criada no caminho de sucesso', async () => {
    const criada = { id: 'i1' } as unknown as Interacao;
    const registrar = jest.fn().mockResolvedValue(criada);
    const controller = new InteracaoController(serviceStub({ registrarInteracao: registrar }));
    const { res, status, json } = criarRes();

    await controller.registrar(reqStub('p1', BODY_VALIDO), res);

    expect(registrar).toHaveBeenCalledWith('p1', expect.objectContaining({ tipo: 'ligacao' }));
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(criada);
  });

  // Validação Zod falha → 400 e o service nem é chamado.
  it('responde 400 quando o corpo é inválido e não chama o service', async () => {
    const registrar = jest.fn();
    const controller = new InteracaoController(serviceStub({ registrarInteracao: registrar }));
    const { res, status, json } = criarRes();

    await controller.registrar(reqStub('p1', { tipo: '' }), res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Dados de interação inválidos' });
    expect(registrar).not.toHaveBeenCalled();
  });

  // RN01 → parceiro inexistente vira 404.
  it('responde 404 quando o parceiro não é localizado', async () => {
    const registrar = jest
      .fn()
      .mockRejectedValue(new Error('Parceiro não localizado para registro'));
    const controller = new InteracaoController(serviceStub({ registrarInteracao: registrar }));
    const { res, status, json } = criarRes();

    await controller.registrar(reqStub('p1', BODY_VALIDO), res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'Parceiro não localizado para registro' });
  });

  // Erro inesperado do service → 500 com mensagem genérica.
  it('responde 500 em erro inesperado do service', async () => {
    const registrar = jest.fn().mockRejectedValue(new Error('falha no banco'));
    const controller = new InteracaoController(serviceStub({ registrarInteracao: registrar }));
    const { res, status, json } = criarRes();

    await controller.registrar(reqStub('p1', BODY_VALIDO), res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });

  // responderErroRegistro: erro que não é instância de Error → 500 genérico.
  it('responde 500 quando o service rejeita com valor que não é Error', async () => {
    const registrar = jest.fn().mockRejectedValue('falha em string');
    const controller = new InteracaoController(serviceStub({ registrarInteracao: registrar }));
    const { res, status, json } = criarRes();

    await controller.registrar(reqStub('p1', BODY_VALIDO), res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });

  // extrairIdParam: quando params.id vem como array, usa o primeiro.
  it('usa o primeiro id quando params.id vem como array', async () => {
    const registrar = jest.fn().mockResolvedValue({ id: 'i1' } as unknown as Interacao);
    const controller = new InteracaoController(serviceStub({ registrarInteracao: registrar }));
    const { res } = criarRes();

    await controller.registrar(reqStub(['p-array', 'p2'], BODY_VALIDO), res);

    expect(registrar).toHaveBeenCalledWith('p-array', expect.objectContaining({ tipo: 'ligacao' }));
  });
});
