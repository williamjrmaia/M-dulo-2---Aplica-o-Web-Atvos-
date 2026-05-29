import { Request, Response } from 'express';
import { UserController } from '../controllers/userController';
import { UserService } from '../services/userService';

describe('UserController - PUT /usuarios/:id', () => {
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
      atualizaUsuario: jest.fn(),
      atualizaPerfilDeAcesso: jest.fn(),
      buscarUsuario: jest.fn(),
      listarPerfis: jest.fn(),
    }) as unknown as jest.Mocked<UserService>;

  it('deve responder 200 quando usuario for atualizado', async () => {
    // Arrange
    const service = criarServiceMock();
    service.atualizaUsuario.mockResolvedValue({
      id: 'usuario-1',
      perfil_acesso_id: 'perfil-1',
      nome: 'Usuario Editado',
      email: 'editado@atvos.com',
      senha_hash: null,
      ativo: true,
      criado_em: new Date('2026-05-29T00:00:00.000Z'),
    });
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      body: { nome: 'Usuario Editado', email: 'editado@atvos.com' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.atualizaUsuario(req, res);

    // Assert
    expect(service.atualizaUsuario).toHaveBeenCalledWith('usuario-1', {
      nome: 'Usuario Editado',
      email: 'editado@atvos.com',
      ativo: undefined,
      perfil_acesso_id: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: 'Dados atualizados com governanca',
      usuario: expect.objectContaining({ id: 'usuario-1', nome: 'Usuario Editado' }),
    });
  });

  it('deve responder 400 quando payload for invalido', async () => {
    // Arrange
    const service = criarServiceMock();
    service.atualizaUsuario.mockRejectedValue(new Error('Dados de entrada invalidos'));
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      body: { email: 'email-invalido' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.atualizaUsuario(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Dados de entrada invalidos' });
  });

  it('deve responder 404 quando usuario nao existir', async () => {
    // Arrange
    const service = criarServiceMock();
    service.atualizaUsuario.mockRejectedValue(new Error('Usuario nao localizado na base'));
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-inexistente' },
      body: { nome: 'Novo Nome' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.atualizaUsuario(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario nao localizado na base' });
  });

  it('deve responder 500 quando houver falha tecnica', async () => {
    // Arrange
    const service = criarServiceMock();
    service.atualizaUsuario.mockRejectedValue(new Error('Falha de banco'));
    const controller = new UserController(service);
    const req = {
      params: { id: 'usuario-1' },
      body: { nome: 'Novo Nome' },
    } as unknown as Request;
    const res = criarResponseMock();

    // Act
    await controller.atualizaUsuario(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });
});
