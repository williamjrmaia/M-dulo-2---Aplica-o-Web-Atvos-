import { Request, Response } from 'express';
import { UserController } from '../controllers/userController';
import { UserService } from '../services/userService';

const MSG_AUTO_INATIVACAO = 'Nao e permitido inativar o proprio usuario';

// Mock de Response capturando status/json/render, sem subir servidor nem banco.
function criarRes() {
  const status = jest.fn();
  const json = jest.fn();
  const render = jest.fn();
  const res = { status, json, render } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  render.mockReturnValue(res);
  return { res, status, json, render };
}

function serviceStub(overrides: Partial<UserService> = {}): UserService {
  return {
    inativarUsuario: jest.fn(),
    buscarUsuario: jest.fn().mockResolvedValue({ id: 'alvo', nome: 'Alvo' }),
    ...overrides,
  } as unknown as UserService;
}

function reqInativar(alvoId: string, autenticadoId: string): Request {
  return {
    params: { id: alvoId },
    headers: {},
    usuario: { id: autenticadoId, perfil: 'administrador' },
  } as unknown as Request;
}

describe('UserController — bloqueio de auto-inativação', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  it('API: bloqueia (409) ao tentar inativar a própria conta e não chama o service', async () => {
    const service = serviceStub();
    const controller = new UserController(service);
    const { res, status, json } = criarRes();

    await controller.inativarUsuario(reqInativar('mesmo-id', 'mesmo-id'), res);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({ error: MSG_AUTO_INATIVACAO });
    expect(service.inativarUsuario).not.toHaveBeenCalled();
  });

  it('API: inativar OUTRO usuário continua funcionando (200)', async () => {
    const service = serviceStub({
      inativarUsuario: jest
        .fn()
        .mockResolvedValue({ id: 'alvo', nome: 'Alvo', ativo: false }),
    });
    const controller = new UserController(service);
    const { res, status, json } = criarRes();

    await controller.inativarUsuario(reqInativar('alvo', 'admin-logado'), res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: 'Acesso revogado e historico preservado' }),
    );
    expect(service.inativarUsuario).toHaveBeenCalledWith('alvo');
  });

  it('Formulário: bloqueia (409) e renderiza a página de inativação com a mensagem', async () => {
    const service = serviceStub();
    const controller = new UserController(service);
    const { res, status, render } = criarRes();

    await controller.inativarUsuarioViaFormulario(reqInativar('mesmo-id', 'mesmo-id'), res);

    expect(status).toHaveBeenCalledWith(409);
    expect(render).toHaveBeenCalledWith(
      'usuarios/inativar',
      expect.objectContaining({ error: MSG_AUTO_INATIVACAO }),
    );
    expect(service.inativarUsuario).not.toHaveBeenCalled();
  });
});
