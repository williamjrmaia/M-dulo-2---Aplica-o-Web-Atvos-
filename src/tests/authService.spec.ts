import bcrypt from 'bcryptjs';
import { AuthService } from '../services/authService';
import { UserRepository, Usuario } from '../repositories/userRepository';
import { AuthSessionRepository } from '../repositories/authSessionRepository';
import { AuthSessao } from '../models/AuthSessao';

const SENHA_CORRETA = 'senha-correta';
const HASH = bcrypt.hashSync(SENHA_CORRETA, 8);

const usuarioValido: Usuario = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Analista Teste',
  email: 'analista@atvos.test',
  senha_hash: HASH,
  ativo: true,
  perfil_acesso_id: '22222222-2222-2222-2222-222222222222',
} as Usuario;

function sessaoBase(over: Partial<AuthSessao> = {}): AuthSessao {
  return {
    id: 'sess-1',
    usuario_id: usuarioValido.id,
    token: 'token-fake',
    ativa: true,
    criada_em: new Date('2026-06-09T00:00:00Z'),
    expira_em: new Date('2026-06-09T08:00:00Z'),
    revogada_em: null,
    revogada_por: null,
    ...over,
  };
}

function userRepoStub(usuario: Usuario | null): UserRepository {
  return { buscarPorEmail: async () => usuario } as unknown as UserRepository;
}

function sessionRepoStub(over: Partial<Record<string, unknown>>): AuthSessionRepository {
  return over as unknown as AuthSessionRepository;
}

describe('AuthService.autenticar (unitário, com stub)', () => {
  // CT01 → RN02 (RF011): credenciais válidas geram token e sessão
  it('autentica e devolve token, dados do usuário e sessão quando as credenciais são válidas', async () => {
    const service = new AuthService(
      userRepoStub(usuarioValido),
      sessionRepoStub({ criarSessao: async () => sessaoBase() })
    );

    const resultado = await service.autenticar(usuarioValido.email, SENHA_CORRETA);

    expect(resultado.token).toBeTruthy();
    expect(resultado.usuario.email).toBe(usuarioValido.email);
    expect(resultado.sessao.id).toBe('sess-1');
  });

  // CT02 → RN02 (RF011): e-mail inexistente é rejeitado
  it('rejeita o login quando o usuário não existe', async () => {
    const service = new AuthService(
      userRepoStub(null),
      sessionRepoStub({ criarSessao: async () => sessaoBase() })
    );

    await expect(service.autenticar('nao@existe.test', SENHA_CORRETA)).rejects.toThrow(
      'Credenciais inválidas'
    );
  });

  // CT03 → RN02 (RF011): senha incorreta é rejeitada
  it('rejeita o login quando a senha está incorreta', async () => {
    const service = new AuthService(
      userRepoStub(usuarioValido),
      sessionRepoStub({ criarSessao: async () => sessaoBase() })
    );

    await expect(service.autenticar(usuarioValido.email, 'senha-errada')).rejects.toThrow(
      'Credenciais inválidas'
    );
  });
});

describe('AuthService.encerrarSessao (unitário, com stub)', () => {
  // CT04 → RN02 (RF011): sessão ativa é encerrada com sucesso
  it('encerra uma sessão ativa existente', async () => {
    const service = new AuthService(
      userRepoStub(usuarioValido),
      sessionRepoStub({
        buscarSessao: async () => sessaoBase({ ativa: true }),
        encerrarSessao: async () => sessaoBase({ ativa: false }),
      })
    );

    const sessao = await service.encerrarSessao('sess-1');
    expect(sessao.ativa).toBe(false);
  });

  // CT05 → RN02 (RF011): sessão inexistente é rejeitada
  it('rejeita o encerramento de uma sessão inexistente', async () => {
    const service = new AuthService(
      userRepoStub(usuarioValido),
      sessionRepoStub({ buscarSessao: async () => null })
    );

    await expect(service.encerrarSessao('sess-x')).rejects.toThrow('Sessao nao encontrada');
  });

  // CT06 → RN02 (RF011): sessão já encerrada não é encerrada de novo
  it('rejeita o encerramento de uma sessão já encerrada', async () => {
    const service = new AuthService(
      userRepoStub(usuarioValido),
      sessionRepoStub({ buscarSessao: async () => sessaoBase({ ativa: false }) })
    );

    await expect(service.encerrarSessao('sess-1')).rejects.toThrow('Sessao ja encerrada');
  });
});
