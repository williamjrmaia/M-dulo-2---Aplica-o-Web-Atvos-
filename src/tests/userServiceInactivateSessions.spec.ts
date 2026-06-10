import { AuthSessionRepository } from '../repositories/authSessionRepository';
import { UserRepository } from '../repositories/userRepository';
import { UserService } from '../services/userService';

const usuarioAtivo = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Administrador Teste',
  email: 'admin@atvos.test',
  senha_hash: null,
  ativo: true,
  perfil_acesso_id: '22222222-2222-2222-2222-222222222222',
  criado_em: new Date('2026-06-10T00:00:00Z'),
};

describe('UserService.inativarUsuario revoga sessões', () => {
  it('marca usuário como inativo e encerra sessões ativas do usuário', async () => {
    const userRepository = {
      buscarPorId: jest.fn().mockResolvedValue(usuarioAtivo),
      inativarUsuario: jest.fn().mockResolvedValue({ ...usuarioAtivo, ativo: false }),
    } as unknown as UserRepository;
    const authSessionRepository = {
      encerrarSessoesAtivasDoUsuario: jest.fn().mockResolvedValue(2),
    } as unknown as AuthSessionRepository;
    const service = new UserService(userRepository, authSessionRepository);

    const resultado = await service.inativarUsuario(usuarioAtivo.id);

    expect(resultado.ativo).toBe(false);
    expect(authSessionRepository.encerrarSessoesAtivasDoUsuario).toHaveBeenCalledWith(usuarioAtivo.id);
  });
});
