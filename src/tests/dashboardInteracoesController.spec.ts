import { DashboardController } from '../controllers/dashboardInteracoesController';
import { DashboardService } from '../services/dashboardInteracoesService';
import {
  ServiceUnavailableException,
  NoContentException,
} from '../errors/dashboardInteracoesErrors';
import { Request, Response } from 'express';

// Mock de Response: captura status/json sem subir servidor nem banco.
function criarRes() {
  const status = jest.fn();
  const json = jest.fn();
  const res = { status, json } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, status, json };
}

function serviceStub(processar: jest.Mock): DashboardService {
  return { processarDashboardInteracoes: processar } as unknown as DashboardService;
}

const req = {} as Request;

describe('DashboardController.getDashboardInteracoes (unitário, com mock de service)', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  // Sucesso → 200 com o DTO de métricas.
  it('responde 200 com o DTO no caminho de sucesso', async () => {
    const dto = { totalInteracoes: 3 };
    const controller = new DashboardController(
      serviceStub(jest.fn().mockResolvedValue(dto))
    );
    const { res, status, json } = criarRes();

    await controller.getDashboardInteracoes(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(dto);
  });

  // Sem registros → 404.
  it('responde 404 quando não há dados (NoContentException)', async () => {
    const controller = new DashboardController(
      serviceStub(jest.fn().mockRejectedValue(new NoContentException('sem dados')))
    );
    const { res, status, json } = criarRes();

    await controller.getDashboardInteracoes(req, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ erro: 'sem dados' });
  });

  // Indisponibilidade → 503.
  it('responde 503 em ServiceUnavailableException', async () => {
    const controller = new DashboardController(
      serviceStub(jest.fn().mockRejectedValue(new ServiceUnavailableException('indisponível')))
    );
    const { res, status, json } = criarRes();

    await controller.getDashboardInteracoes(req, res);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ erro: 'indisponível' });
  });

  // Erro inesperado → 500 genérico.
  it('responde 500 genérico em erro inesperado', async () => {
    const controller = new DashboardController(
      serviceStub(jest.fn().mockRejectedValue(new Error('boom')))
    );
    const { res, status, json } = criarRes();

    await controller.getDashboardInteracoes(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ erro: 'Erro interno do servidor' });
  });
});
