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

  // CT44 → RN02 (RF011): usuário inexistente ou inativo não gera token de primeiro acesso
  it('não gera token para usuário inexistente ou inativo', async () => {
    const serviceInexistente = new PrimeiroAcessoService(
      userRepositoryStub({ buscarPorEmail: jest.fn().mockResolvedValue(null) }),
      primeiroAcessoRepositoryStub({})
    );
    await expect(serviceInexistente.solicitarToken('fantasma@atvos.test')).rejects.toThrow(
      'Usuário não elegível para primeiro acesso'
    );

    const serviceInativo = new PrimeiroAcessoService(
      userRepositoryStub({
        buscarPorEmail: jest.fn().mockResolvedValue({ ...usuarioSemSenha, ativo: false }),
      }),
      primeiroAcessoRepositoryStub({})
    );
    await expect(serviceInativo.solicitarToken(usuarioSemSenha.email)).rejects.toThrow(
      'Usuário não elegível para primeiro acesso'
    );
  });

  // CT45 → RN02 (RF011): token cujo usuário não existe mais ou está inativo é rejeitado
  it('rejeita token cujo usuário não existe ou está inativo', async () => {
    const tokenRegistro = {
      id: '55555555-5555-5555-5555-555555555555',
      usuario_id: usuarioSemSenha.id,
      token_hash: 'hash-token',
      criado_em: new Date(),
      expira_em: new Date(Date.now() + 60_000),
      usado_em: null,
    };
    const serviceUsuarioInexistente = new PrimeiroAcessoService(
      userRepositoryStub({ buscarPorId: jest.fn().mockResolvedValue(null) }),
      primeiroAcessoRepositoryStub({ buscarTokenValido: jest.fn().mockResolvedValue(tokenRegistro) })
    );
    await expect(serviceUsuarioInexistente.definirSenha('token-valido', 'Senha@123')).rejects.toThrow(
      'Token inválido ou expirado'
    );

    const serviceUsuarioInativo = new PrimeiroAcessoService(
      userRepositoryStub({
        buscarPorId: jest.fn().mockResolvedValue({ ...usuarioSemSenha, ativo: false }),
      }),
      primeiroAcessoRepositoryStub({ buscarTokenValido: jest.fn().mockResolvedValue(tokenRegistro) })
    );
    await expect(serviceUsuarioInativo.definirSenha('token-valido', 'Senha@123')).rejects.toThrow(
      'Token inválido ou expirado'
    );
  });

  // CT46 → RN02 (RF011): e-mail é obrigatório para definir a senha por e-mail
  it('rejeita email vazio em definirSenhaPorEmail', async () => {
    const service = new PrimeiroAcessoService(
      userRepositoryStub({}),
      primeiroAcessoRepositoryStub({})
    );
    await expect(service.definirSenhaPorEmail('', 'Senha@123')).rejects.toThrow(
      'E-mail obrigatório'
    );
  });

  // CT47 → RN02 (RF011): senha do primeiro acesso por e-mail deve ter pelo menos 8 caracteres
  it('rejeita senha com menos de 8 caracteres em definirSenhaPorEmail', async () => {
    const service = new PrimeiroAcessoService(
      userRepositoryStub({}),
      primeiroAcessoRepositoryStub({})
    );
    await expect(service.definirSenhaPorEmail(usuarioSemSenha.email, '1234567')).rejects.toThrow(
      'Senha deve ter pelo menos 8 caracteres'
    );
  });

  // CT48 → RN02 (RF011): apenas usuário cadastrado e ativo define senha por e-mail
  it('rejeita usuário inexistente ou inativo em definirSenhaPorEmail', async () => {
    const serviceInexistente = new PrimeiroAcessoService(
      userRepositoryStub({ buscarPorEmail: jest.fn().mockResolvedValue(null) }),
      primeiroAcessoRepositoryStub({})
    );
    await expect(
      serviceInexistente.definirSenhaPorEmail('fantasma@atvos.test', 'Senha@123')
    ).rejects.toThrow('Usuário não elegível para primeiro acesso');

    const serviceInativo = new PrimeiroAcessoService(
      userRepositoryStub({
        buscarPorEmail: jest.fn().mockResolvedValue({ ...usuarioSemSenha, ativo: false }),
      }),
      primeiroAcessoRepositoryStub({})
    );
    await expect(
      serviceInativo.definirSenhaPorEmail(usuarioSemSenha.email, 'Senha@123')
    ).rejects.toThrow('Usuário não elegível para primeiro acesso');
  });

  // CT49 → RN01 (RF011): usuário que já possui senha não redefine pelo primeiro acesso
  it('rejeita usuário que já possui senha em definirSenhaPorEmail', async () => {
    const service = new PrimeiroAcessoService(
      userRepositoryStub({
        buscarPorEmail: jest.fn().mockResolvedValue({ ...usuarioSemSenha, senha_hash: 'hash-existente' }),
      }),
      primeiroAcessoRepositoryStub({})
    );
    await expect(service.definirSenhaPorEmail(usuarioSemSenha.email, 'Senha@123')).rejects.toThrow(
      'Usuário já acessou o sistema anteriormente'
    );
  });

  // CT50 → RN02 (RF011): senha por e-mail é gravada como hash bcrypt e e-mail é normalizado
  it('define senha por e-mail com hash bcrypt e normaliza e-mail para minúsculas', async () => {
    const buscarPorEmail = jest.fn().mockResolvedValue(usuarioSemSenha);
    const definirSenha = jest.fn().mockResolvedValue({ ...usuarioSemSenha, senha_hash: 'hash' });
    const service = new PrimeiroAcessoService(
      userRepositoryStub({ buscarPorEmail, definirSenha }),
      primeiroAcessoRepositoryStub({})
    );

    await service.definirSenhaPorEmail('PRIMEIRO@ATVOS.TEST', 'Senha@123');

    expect(buscarPorEmail).toHaveBeenCalledWith('primeiro@atvos.test');
    expect(definirSenha).toHaveBeenCalledWith(usuarioSemSenha.id, expect.any(String));
    const senhaHashGravada = definirSenha.mock.calls[0][1] as string;
    expect(senhaHashGravada).not.toBe('Senha@123');
    expect(await bcrypt.compare('Senha@123', senhaHashGravada)).toBe(true);
  });
});
