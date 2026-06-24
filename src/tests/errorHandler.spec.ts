import { errorHandler } from '../middlewares/errorHandler';
import { AppError, NotFoundError } from '../errors/AppError';
import { Request, Response, NextFunction } from 'express';

function criarRes(headersSent = false) {
  const status = jest.fn();
  const json = jest.fn();
  const setHeader = jest.fn();
  const res = { headersSent, status, json, setHeader } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, status, json, setHeader };
}

const req = {} as Request;
const next = (() => undefined) as NextFunction;

describe('errorHandler', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('responde com o status do AppError', () => {
    const { res, status, json } = criarRes();

    errorHandler(new NotFoundError('parceiro não encontrado'), req, res, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'parceiro não encontrado' });
  });

  it('responde 500 genérico para erro desconhecido', () => {
    const { res, status, json } = criarRes();

    errorHandler(new Error('falha qualquer'), req, res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });

  it('não escreve resposta se os headers já foram enviados (evita double-send)', () => {
    const { res, status } = criarRes(true);

    errorHandler(new Error('tarde demais'), req, res, next);

    expect(status).not.toHaveBeenCalled();
  });

  describe('banco indisponível → 503 com Retry-After', () => {
    it.each([
      ['EAI_AGAIN', { code: 'EAI_AGAIN', message: 'getaddrinfo EAI_AGAIN host' }],
      ['ECONNREFUSED', { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' }],
      ['ETIMEDOUT', { code: 'ETIMEDOUT', message: 'timeout' }],
      ['SQLSTATE 57014 (query timeout)', { code: '57014', message: 'canceling statement' }],
      ['SQLSTATE 08006 (connection failure)', { code: '08006', message: 'connection failure' }],
    ])('mapeia %s para 503', (_titulo, erro) => {
      const { res, status, json, setHeader } = criarRes();

      errorHandler(Object.assign(new Error(erro.message), { code: erro.code }), req, res, next);

      expect(setHeader).toHaveBeenCalledWith('Retry-After', '5');
      expect(status).toHaveBeenCalledWith(503);
      expect(json).toHaveBeenCalledWith({
        error: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
      });
    });

    it('mapeia por mensagem quando não há code (Connection terminated)', () => {
      const { res, status } = criarRes();

      errorHandler(new Error('Connection terminated unexpectedly'), req, res, next);

      expect(status).toHaveBeenCalledWith(503);
    });

    it('não confunde AppError de domínio com indisponibilidade', () => {
      const { res, status } = criarRes();

      errorHandler(new AppError(409, 'conflito de status'), req, res, next);

      expect(status).toHaveBeenCalledWith(409);
    });
  });
});
