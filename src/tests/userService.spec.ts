import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';

describe('UserService - atualizaPerfilDeAcesso', () => {
  const usuarioAtualizado = {
    id: 'usuario-1',
    perfil_acesso_id: 'perfil-1',
    nome: 'Usuario Teste',
    email: 'usuario@atvos.com',
    senha_hash: null,
    ativo: true,
    criado_em: new Date('2026-05-27T00:00:00.000Z'),
  };

  const criarRepositoryMock = () =>
    ({
      checarExistenciaPerfil: jest.fn(),
      atualizaPerfilDeAcesso: jest.fn(),
      buscarPorId: jest.fn(),
      listarPerfis: jest.fn(),
    }) as unknown as jest.Mocked<UserRepository>;

  it('deve atualizar o perfil quando o perfil existe', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    repository.checarExistenciaPerfil.mockResolvedValue(true);
    repository.atualizaPerfilDeAcesso.mockResolvedValue(usuarioAtualizado);
    const service = new UserService(repository);

    // Act
    const resultado = await service.atualizaPerfilDeAcesso('usuario-1', 'perfil-1');

    // Assert
    expect(repository.checarExistenciaPerfil).toHaveBeenCalledWith('perfil-1');
    expect(repository.atualizaPerfilDeAcesso).toHaveBeenCalledWith('usuario-1', 'perfil-1');
    expect(resultado).toEqual(usuarioAtualizado);
  });

  it('deve bloquear a atualizacao quando o perfil nao existe', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    repository.checarExistenciaPerfil.mockResolvedValue(false);
    const service = new UserService(repository);

    // Act
    const acao = service.atualizaPerfilDeAcesso('usuario-1', 'perfil-inexistente');

    // Assert
    await expect(acao).rejects.toThrow('Perfil nao encontrado');
    expect(repository.atualizaPerfilDeAcesso).not.toHaveBeenCalled();
  });

  it('deve validar campos obrigatorios antes de consultar o repositorio', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    const service = new UserService(repository);

    // Act
    const acao = service.atualizaPerfilDeAcesso('usuario-1', '');

    // Assert
    await expect(acao).rejects.toThrow('Dados obrigatorios ausentes');
    expect(repository.checarExistenciaPerfil).not.toHaveBeenCalled();
  });

  it('deve informar quando o usuario nao existe', async () => {
    // Arrange
    const repository = criarRepositoryMock();
    repository.checarExistenciaPerfil.mockResolvedValue(true);
    repository.atualizaPerfilDeAcesso.mockResolvedValue(null);
    const service = new UserService(repository);

    // Act
    const acao = service.atualizaPerfilDeAcesso('usuario-inexistente', 'perfil-1');

    // Assert
    await expect(acao).rejects.toThrow('Usuario nao encontrado');
  });
});
