import { ExportaController } from '../controllers/exportaController';
import { ExportaService } from '../services/exportaService';
import {
  EmptyDataException,
  DataAccessException,
  InternalError,
} from '../errors/exportaErrors';
import { Request, Response } from 'express';

// Mock de Response: captura status/json/send/setHeader sem subir servidor.
function criarRes() {
  const status = jest.fn();
  const json = jest.fn();
  const send = jest.fn();
  const setHeader = jest.fn();
  const res = { status, json, send, setHeader } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  send.mockReturnValue(res);
  setHeader.mockReturnValue(res);
  return { res, status, json, send, setHeader };
}

function serviceStub(processar: jest.Mock): ExportaService {
  return { processarExportacaoParceiros: processar } as unknown as ExportaService;
}

const req = {} as Request;

describe('ExportaController.exportarParceiros (unitário, com mock de service)', () => {
  // Sucesso → 200 com CSV e cabeçalhos de download.
  it('responde 200 com CSV e cabeçalhos de download no sucesso', async () => {
    const buffer = Buffer.from('nome\nFazenda', 'utf-8');
    const controller = new ExportaController(
      serviceStub(jest.fn().mockResolvedValue(buffer))
    );
    const { res, status, send, setHeader } = criarRes();

    await controller.exportarParceiros(req, res);

    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="dados_parceiros_ativos.csv"'
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith(buffer);
  });

  // Sem dados → 404.
  it('responde 404 quando não há dados (EmptyDataException)', async () => {
    const controller = new ExportaController(
      serviceStub(jest.fn().mockRejectedValue(new EmptyDataException('vazio')))
    );
    const { res, status, json } = criarRes();

    await controller.exportarParceiros(req, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ erro: 'vazio' });
  });

  // Falha de acesso a dados → 500 com mensagem fixa.
  it('responde 500 com mensagem fixa em DataAccessException', async () => {
    const controller = new ExportaController(
      serviceStub(jest.fn().mockRejectedValue(new DataAccessException()))
    );
    const { res, status, json } = criarRes();

    await controller.exportarParceiros(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ erro: 'Falha na geração do arquivo' });
  });

  // Erro interno conhecido → 500 com a mensagem do erro.
  it('responde 500 com a mensagem do erro em InternalError', async () => {
    const controller = new ExportaController(
      serviceStub(jest.fn().mockRejectedValue(new InternalError('falha interna')))
    );
    const { res, status, json } = criarRes();

    await controller.exportarParceiros(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ erro: 'falha interna' });
  });

  // Erro desconhecido → 500 genérico.
  it('responde 500 genérico para erro desconhecido', async () => {
    const controller = new ExportaController(
      serviceStub(jest.fn().mockRejectedValue(new Error('boom')))
    );
    const { res, status, json } = criarRes();

    await controller.exportarParceiros(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ erro: 'Erro interno do servidor' });
  });
});
