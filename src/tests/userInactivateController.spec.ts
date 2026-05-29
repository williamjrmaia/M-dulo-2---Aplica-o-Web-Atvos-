import { Request, Response } from 'express';
import { UserController } from '../controllers/userController';
import { UserService } from '../services/userService';

describe('UserController - PUT /usuarios/:id/inativar', () => {
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
      inativarUsuario: jest.fn(),
      atualizaPerfilDeAcesso: jest.fn(),
      buscarUsuario: jest.fn(),
      listarPerfis: jest.fn(),
    }) as unknown as jest.Mocked<UserService>;

  it('deve responder 200 quando admin inativar usuario existente', async () => {
    // Arrange
    const service = criarServiceMock();
    service.inativarUsuario.mockResolvedValue({
      id: 'usuario-1',
      perfil_acesso_id: 'perfil-1',
      nome: 'Usuario Inativado',
      email: 'usuario@atvos.com',
      senha_hash: null,
      ativo: false,
      criado_em: new Date('2026-05-29T00:00:00.000Z'),
    });
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      headers: { authorization: 'Bearer token-valido', 'x-user-role': 'administrador' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.inativarUsuario(req, res);

    // Assert
    expect(service.inativarUsuario).toHaveBeenCalledWith('usuario-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: 'Acesso revogado e historico preservado',
      usuario: expect.objectContaining({ id: 'usuario-1', ativo: false }),
    });
  });

  it('deve responder 401 quando token estiver ausente', async () => {
    // Arrange
    const service = criarServiceMock();
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      headers: { 'x-user-role': 'administrador' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.inativarUsuario(req, res);

    // Assert
    expect(service.inativarUsuario).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token invalido ou ausente' });
  });

  it('deve responder 403 quando usuario nao for administrador', async () => {
    // Arrange
    const service = criarServiceMock();
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      headers: { authorization: 'Bearer token-valido', 'x-user-role': 'coordenador' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.inativarUsuario(req, res);

    // Assert
    expect(service.inativarUsuario).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario sem permissao de administrador' });
  });

  it('deve responder 404 quando usuario nao existir', async () => {
    // Arrange
    const service = criarServiceMock();
    service.inativarUsuario.mockRejectedValue(new Error('Usuario nao encontrado'));
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-inexistente' },
      headers: { authorization: 'Bearer token-valido', 'x-user-role': 'administrador' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.inativarUsuario(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario nao encontrado' });
  });

  it('deve responder 500 quando houver falha tecnica', async () => {
    // Arrange
    const service = criarServiceMock();
    service.inativarUsuario.mockRejectedValue(new Error('Falha de banco'));
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      headers: { authorization: 'Bearer token-valido', 'x-user-role': 'administrador' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.inativarUsuario(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });
});
