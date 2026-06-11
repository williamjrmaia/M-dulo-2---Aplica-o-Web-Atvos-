import bcrypt from 'bcryptjs';
import { PrimeiroAcessoRepository } from '../repositories/primeiroAcessoRepository';
import { UserRepository } from '../repositories/userRepository';
import { PrimeiroAcessoService } from '../services/primeiroAcessoService';

const usuarioSemSenha = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Usuario Primeiro Acesso',
  email: 'primeiro@atvos.test',
  senha_hash: null,
  ativo: true,
  perfil_acesso_id: '22222222-2222-2222-2222-222222222222',
};

function userRepositoryStub(overrides: Partial<UserRepository>): UserRepository {
  return overrides as UserRepository;
}

function primeiroAcessoRepositoryStub(overrides: Partial<PrimeiroAcessoRepository>): PrimeiroAcessoRepository {
  return overrides as PrimeiroAcessoRepository;
}

describe('PrimeiroAcessoService', () => {
  it('gera token expirável para usuário ativo sem senha', async () => {
    const primeiroAcessoRepository = primeiroAcessoRepositoryStub({
      invalidarTokensPendentes: jest.fn().mockResolvedValue(undefined),
      criarToken: jest.fn().mockResolvedValue({}),
    });
    const service = new PrimeiroAcessoService(
      userRepositoryStub({ buscarPorEmail: jest.fn().mockResolvedValue(usuarioSemSenha) }),
      primeiroAcessoRepository
    );

    const resultado = await service.solicitarToken(usuarioSemSenha.email);

    expect(resultado.token).toHaveLength(64);
    expect(resultado.expira_em).toBeInstanceOf(Date);
    expect(primeiroAcessoRepository.invalidarTokensPendentes).toHaveBeenCalledWith(usuarioSemSenha.id);
    expect(primeiroAcessoRepository.criarToken).toHaveBeenCalledWith(
      usuarioSemSenha.id,
      expect.any(String),
      resultado.expira_em
    );
  });

  it('não gera token para usuário que já possui senha', async () => {
    const service = new PrimeiroAcessoService(
      userRepositoryStub({
        buscarPorEmail: jest.fn().mockResolvedValue({ ...usuarioSemSenha, senha_hash: 'hash-existente' }),
      }),
      primeiroAcessoRepositoryStub({})
    );

    await expect(service.solicitarToken(usuarioSemSenha.email)).rejects.toThrow(
      'Usuário não elegível para primeiro acesso'
    );
  });

  it('define senha com hash e marca token como usado', async () => {
    const tokenRegistro = {
      id: '33333333-3333-3333-3333-333333333333',
      usuario_id: usuarioSemSenha.id,
      token_hash: 'hash-token',
      criado_em: new Date(),
      expira_em: new Date(Date.now() + 60_000),
      usado_em: null,
    };
    const userRepository = userRepositoryStub({
      buscarPorId: jest.fn().mockResolvedValue(usuarioSemSenha),
      definirSenha: jest.fn().mockResolvedValue({ ...usuarioSemSenha, senha_hash: 'hash' }),
    });
    const primeiroAcessoRepository = primeiroAcessoRepositoryStub({
      buscarTokenValido: jest.fn().mockResolvedValue(tokenRegistro),
      marcarComoUsado: jest.fn().mockResolvedValue(undefined),
    });
    const service = new PrimeiroAcessoService(userRepository, primeiroAcessoRepository);

    await service.definirSenha('token-valido', 'Senha@123');

    expect(userRepository.definirSenha).toHaveBeenCalledWith(usuarioSemSenha.id, expect.any(String));
    const senhaHash = (userRepository.definirSenha as jest.Mock).mock.calls[0][1] as string;
    await expect(bcrypt.compare('Senha@123', senhaHash)).resolves.toBe(true);
    expect(primeiroAcessoRepository.marcarComoUsado).toHaveBeenCalledWith(tokenRegistro.id);
  });

  it('rejeita token inexistente, expirado ou já usado', async () => {
    const service = new PrimeiroAcessoService(
      userRepositoryStub({}),
      primeiroAcessoRepositoryStub({ buscarTokenValido: jest.fn().mockResolvedValue(null) })
    );

    await expect(service.definirSenha('token-invalido', 'Senha@123')).rejects.toThrow(
      'Token inválido ou expirado'
    );
  });

  // CT40 → RN02 (RF011): e-mail é obrigatório para solicitar o token de primeiro acesso
  it('rejeita email vazio em solicitarToken', async () => {
    const service = new PrimeiroAcessoService(
      userRepositoryStub({}),
      primeiroAcessoRepositoryStub({})
    );
    await expect(service.solicitarToken('')).rejects.toThrow('E-mail obrigatório');
  });

  // CT41 → RN02 (RF011): token é obrigatório para definir a senha
  it('rejeita token vazio em definirSenha', async () => {
    const service = new PrimeiroAcessoService(
      userRepositoryStub({}),
      primeiroAcessoRepositoryStub({})
    );
    await expect(service.definirSenha('', 'Senha@123')).rejects.toThrow('Token obrigatório');
  });

  // CT42 → RN02 (RF011): senha do primeiro acesso deve ter pelo menos 8 caracteres
  it('rejeita senha com menos de 8 caracteres em definirSenha', async () => {
    const service = new PrimeiroAcessoService(
      userRepositoryStub({}),
      primeiroAcessoRepositoryStub({})
    );
    await expect(service.definirSenha('token-valido', '1234567')).rejects.toThrow(
      'Senha deve ter pelo menos 8 caracteres'
    );
  });

  // CT43 → RN01 (RF011): usuário que já possui senha não é elegível ao primeiro acesso
  it('rejeita quando usuario ja possui senha apos validar token', async () => {
    const tokenRegistro = {
      id: '44444444-4444-4444-4444-444444444444',
      usuario_id: usuarioSemSenha.id,
      token_hash: 'hash-token',
      criado_em: new Date(),
      expira_em: new Date(Date.now() + 60_000),
      usado_em: null,
    };
    const service = new PrimeiroAcessoService(
      userRepositoryStub({
        buscarPorId: jest.fn().mockResolvedValue({ ...usuarioSemSenha, senha_hash: 'hash-existente' }),
      }),
      primeiroAcessoRepositoryStub({
        buscarTokenValido: jest.fn().mockResolvedValue(tokenRegistro),
      })
    );
    await expect(service.definirSenha('token-valido', 'Senha@123')).rejects.toThrow(
      'Token inválido ou expirado'
    );
  });
});
