import { UserRepository } from '../repositories/userRepository';
import { UserService } from '../services/userService';

describe('UserService - atualizaUsuario', () => {
  const usuarioAtual = {
    id: 'usuario-1',
    perfil_acesso_id: 'perfil-1',
    nome: 'Usuario Atual',
    email: 'atual@atvos.com',
    senha_hash: null,
    ativo: true,
    criado_em: new Date('2026-05-29T00:00:00.000Z'),
  };

  const usuarioAtualizado = {
    ...usuarioAtual,
    nome: 'Usuario Editado',
    email: 'editado@atvos.com',
  };

  const criarRepositoryMock = () =>
    ({
      buscarPorEmail: jest.fn(),
      buscarPorId: jest.fn(),
      checarExistenciaPerfil: jest.fn(),
      listarPerfis: jest.fn(),
      atualizaPerfilDeAcesso: jest.fn(),
      atualizaUsuario: jest.fn(),
    }) as unknown as jest.Mocked<UserRepository>;

  it('deve atualizar usuario quando dados forem validos e usuario existir', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    repository.buscarPorId.mockResolvedValue(usuarioAtual);
    repository.atualizaUsuario.mockResolvedValue(usuarioAtualizado);
    const service = new UserService(repository);

    // Act
    const resultado = await service.atualizaUsuario('usuario-1', {
      nome: 'Usuario Editado',
      email: 'editado@atvos.com',
    });

    // Assert
    expect(repository.buscarPorId).toHaveBeenCalledWith('usuario-1');
    expect(repository.atualizaUsuario).toHaveBeenCalledWith('usuario-1', {
      nome: 'Usuario Editado',
      email: 'editado@atvos.com',
    });
    expect(resultado).toEqual(usuarioAtualizado);
  });

  it('deve retornar erro quando payload estiver mal formatado', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    const service = new UserService(repository);

    // Act
    const acao = service.atualizaUsuario('usuario-1', { email: 'email-invalido' });

    // Assert
    await expect(acao).rejects.toThrow('Dados de entrada invalidos');
    expect(repository.buscarPorId).not.toHaveBeenCalled();
  });

  it('deve retornar erro quando usuario nao existir', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    repository.buscarPorId.mockResolvedValue(null);
    const service = new UserService(repository);

    // Act
    const acao = service.atualizaUsuario('usuario-inexistente', { nome: 'Novo Nome' });

    // Assert
    await expect(acao).rejects.toThrow('Usuario nao localizado na base');
    expect(repository.atualizaUsuario).not.toHaveBeenCalled();
  });

  it('deve validar perfil quando perfil_acesso_id for enviado', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    repository.checarExistenciaPerfil.mockResolvedValue(false);
    const service = new UserService(repository);

    // Act
    const acao = service.atualizaUsuario('usuario-1', { perfil_acesso_id: 'perfil-inexistente' });

    // Assert
    await expect(acao).rejects.toThrow('Perfil nao encontrado');
    expect(repository.buscarPorId).not.toHaveBeenCalled();
  });
});
