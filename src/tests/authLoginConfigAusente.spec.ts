import { Request, Response } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/authService';

// Mock de Response capturando status/json/render, sem subir servidor nem view.
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

// Stub do AuthService cujo autenticar rejeita como se o JWT_SECRET faltasse.
function serviceQueFalhaPorConfig(): AuthService {
  return {
    autenticar: jest.fn().mockRejectedValue(new Error('JWT_SECRET nao configurado')),
  } as unknown as AuthService;
}

function reqLogin(loginWeb: boolean): Request {
  return {
    body: { email: 'analista@atvos.com', senha: 'senha123' },
    is: (tipo: string) =>
      loginWeb && tipo === 'application/x-www-form-urlencoded'
        ? 'application/x-www-form-urlencoded'
        : false,
  } as unknown as Request;
}

describe('AuthController.login — configuração de autenticação ausente', () => {
  it('no fluxo web, renderiza a tela de login (não devolve JSON cru)', async () => {
    const controller = new AuthController(serviceQueFalhaPorConfig());
    const { res, status, json, render } = criarRes();

    await controller.login(reqLogin(true), res);

    expect(status).toHaveBeenCalledWith(500);
    expect(render).toHaveBeenCalledWith(
      'login/index',
      expect.objectContaining({ error: 'Configuração de autenticação ausente' }),
    );
    expect(json).not.toHaveBeenCalled();
  });

  it('no fluxo de API, mantém a resposta JSON', async () => {
    const controller = new AuthController(serviceQueFalhaPorConfig());
    const { res, status, json, render } = criarRes();

    await controller.login(reqLogin(false), res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Configuração de autenticação ausente' });
    expect(render).not.toHaveBeenCalled();
  });

  // Regressão: credenciais inválidas no fluxo web devem continuar
  // renderizando a tela de login (comportamento anterior preservado).
  it('mantém o render da tela de login em credenciais inválidas (web)', async () => {
    const service = {
      autenticar: jest.fn().mockRejectedValue(new Error('Credenciais inválidas')),
    } as unknown as AuthService;
    const controller = new AuthController(service);
    const { res, status, render, json } = criarRes();

    await controller.login(reqLogin(true), res);

    expect(status).toHaveBeenCalledWith(401);
    expect(render).toHaveBeenCalledWith(
      'login/index',
      expect.objectContaining({ error: 'Credenciais inválidas' }),
    );
    expect(json).not.toHaveBeenCalled();
  });
});
