import { UserRepository } from '../repositories/userRepository';
import { UserService } from '../services/userService';

describe('UserService - inativarUsuario', () => {
  const usuarioAtivo = {
    id: 'usuario-1',
    perfil_acesso_id: 'perfil-admin',
    nome: 'Administrador',
    email: 'admin@atvos.com',
    senha_hash: null,
    ativo: true,
    criado_em: new Date('2026-05-29T00:00:00.000Z'),
  };

  const usuarioInativado = {
    ...usuarioAtivo,
    ativo: false,
  };

  const criarRepositoryMock = () =>
    ({
      buscarPorEmail: jest.fn(),
      buscarPorId: jest.fn(),
      checarExistenciaPerfil: jest.fn(),
      listarPerfis: jest.fn(),
      atualizaPerfilDeAcesso: jest.fn(),
      inativarUsuario: jest.fn(),
    }) as unknown as jest.Mocked<UserRepository>;

  it('deve inativar usuario quando ele existir', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    repository.buscarPorId.mockResolvedValue(usuarioAtivo);
    repository.inativarUsuario.mockResolvedValue(usuarioInativado);
    const service = new UserService(repository);

    // Act
    const resultado = await service.inativarUsuario('usuario-1');

    // Assert
    expect(repository.buscarPorId).toHaveBeenCalledWith('usuario-1');
    expect(repository.inativarUsuario).toHaveBeenCalledWith('usuario-1');
    expect(resultado.ativo).toBe(false);
  });

  it('deve retornar erro quando id nao for informado', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    const service = new UserService(repository);

    // Act
    const acao = service.inativarUsuario('');

    // Assert
    await expect(acao).rejects.toThrow('Dados obrigatorios ausentes');
    expect(repository.buscarPorId).not.toHaveBeenCalled();
  });

  it('deve retornar erro quando usuario nao existir', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    repository.buscarPorId.mockResolvedValue(null);
    const service = new UserService(repository);

    // Act
    const acao = service.inativarUsuario('usuario-inexistente');

    // Assert
    await expect(acao).rejects.toThrow('Usuario nao encontrado');
    expect(repository.inativarUsuario).not.toHaveBeenCalled();
  });
});
