import { EventEmitter } from 'events';
import { requestTimeout } from '../middlewares/requestTimeout';
import { Request, Response } from 'express';

// Mock de Response baseado em EventEmitter para simular 'finish'/'close'.
function criarRes(headersSent = false) {
  const emitter = new EventEmitter();
  const status = jest.fn();
  const json = jest.fn();
  const setHeader = jest.fn();
  const res = Object.assign(emitter, {
    headersSent,
    status,
    json,
    setHeader,
  }) as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, emitter, status, json, setHeader };
}

const req = {} as Request;

describe('requestTimeout (middleware de resiliência)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('chama next() imediatamente sem responder', () => {
    const next = jest.fn();
    const { res, status } = criarRes();

    requestTimeout(1000)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('responde 503 com Retry-After quando estoura o tempo sem resposta', () => {
    const next = jest.fn();
    const { res, status, json, setHeader } = criarRes(false);

    requestTimeout(1000)(req, res, next);
    jest.advanceTimersByTime(1000);

    expect(setHeader).toHaveBeenCalledWith('Retry-After', '5');
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({
      error: 'Tempo de resposta excedido. Tente novamente em instantes.',
    });
  });

  it('não responde se a requisição terminou antes do limite (finish limpa o timer)', () => {
    const next = jest.fn();
    const { res, emitter, status } = criarRes(false);

    requestTimeout(1000)(req, res, next);
    emitter.emit('finish');
    jest.advanceTimersByTime(2000);

    expect(status).not.toHaveBeenCalled();
  });

  it('não tenta responder duas vezes se os headers já foram enviados', () => {
    const next = jest.fn();
    const { res, status } = criarRes(true);

    requestTimeout(1000)(req, res, next);
    jest.advanceTimersByTime(1000);

    expect(status).not.toHaveBeenCalled();
  });
});
