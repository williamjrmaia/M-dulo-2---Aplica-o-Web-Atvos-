import { Request, Response } from 'express';
import { UserController } from '../controllers/userController';
import { UserService } from '../services/userService';

describe('UserController - PUT /usuarios/:id/perfil', () => {
  const criarResponseMock = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      render: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
    };

    return res as unknown as jest.Mocked<Response>;
  };

  const criarServiceMock = () =>
    ({
      atualizaPerfilDeAcesso: jest.fn(),
      buscarUsuario: jest.fn(),
      listarPerfis: jest.fn(),
    }) as unknown as jest.Mocked<UserService>;

  it('deve responder 200 quando o perfil for atualizado', async () => {
    // Arrange
    const service = criarServiceMock();
    service.atualizaPerfilDeAcesso.mockResolvedValue({
      id: 'usuario-1',
      perfil_acesso_id: 'perfil-1',
      nome: 'Usuario Teste',
      email: 'usuario@atvos.com',
      senha_hash: null,
      ativo: true,
      criado_em: new Date('2026-05-27T00:00:00.000Z'),
    });
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      body: { role_id: 'perfil-1' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.atualizaPerfilDeAcesso(req, res);

    // Assert
    expect(service.atualizaPerfilDeAcesso).toHaveBeenCalledWith('usuario-1', 'perfil-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: 'Perfil de acesso atualizado',
      usuario: expect.objectContaining({ id: 'usuario-1', perfil_acesso_id: 'perfil-1' }),
    });
  });

  it('deve responder 400 quando o perfil nao existir', async () => {
    // Arrange
    const service = criarServiceMock();
    service.atualizaPerfilDeAcesso.mockRejectedValue(new Error('Perfil nao encontrado'));
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      body: { role_id: 'perfil-inexistente' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.atualizaPerfilDeAcesso(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Perfil nao encontrado' });
  });

  it('deve responder 500 quando ocorrer erro inesperado no service', async () => {
    // Arrange
    const service = criarServiceMock();
    service.atualizaPerfilDeAcesso.mockRejectedValue(new Error('Falha de banco'));
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      body: { role_id: 'perfil-1' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.atualizaPerfilDeAcesso(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });
});
