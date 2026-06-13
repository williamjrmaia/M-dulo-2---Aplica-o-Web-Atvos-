import { loginSchema } from '../schemas/auth.schema';
import { criarInteracaoSchema } from '../schemas/interacao.schema';
import {
  definirSenhaPrimeiroAcessoSchema,
  solicitarPrimeiroAcessoSchema,
} from '../schemas/primeiroAcesso.schema';
import {
  atualizarPerfilUsuarioSchema,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
} from '../schemas/usuario.schema';

const uuid = '11111111-1111-1111-1111-111111111111';

describe('schemas Zod de entrada', () => {
  it('valida payloads corretos de autenticação e primeiro acesso', () => {
    expect(loginSchema.safeParse({ email: 'USER@atvos.test', senha: 'Senha@123' }).success).toBe(true);
    expect(solicitarPrimeiroAcessoSchema.safeParse({ email: 'novo@atvos.test' }).success).toBe(true);
    expect(
      definirSenhaPrimeiroAcessoSchema.safeParse({
        token: 'token',
        senha: 'Senha@123',
        confirmacao_senha: 'Senha@123',
      }).success
    ).toBe(true);
  });

  it('rejeita payloads inválidos de autenticação e primeiro acesso', () => {
    expect(loginSchema.safeParse({ email: 'email-invalido', senha: 'Senha@123' }).success).toBe(false);
    expect(solicitarPrimeiroAcessoSchema.safeParse({ email: '' }).success).toBe(false);
    expect(
      definirSenhaPrimeiroAcessoSchema.safeParse({
        token: 'token',
        senha: 'Senha@123',
        confirmacao_senha: 'Outra@123',
      }).success
    ).toBe(false);
  });

  it('valida payloads corretos de usuário e perfil', () => {
    expect(
      criarUsuarioSchema.safeParse({
        nome: 'Usuario Teste',
        email: 'usuario@atvos.test',
        perfil_acesso_id: uuid,
      }).success
    ).toBe(true);
    expect(atualizarUsuarioSchema.safeParse({ ativo: 'false' }).success).toBe(true);
    expect(atualizarPerfilUsuarioSchema.safeParse({ role_id: uuid }).success).toBe(true);
  });

  it('rejeita payloads inválidos de usuário e perfil', () => {
    expect(
      criarUsuarioSchema.safeParse({
        nome: '',
        email: 'usuario@atvos.test',
        perfil_acesso_id: uuid,
      }).success
    ).toBe(false);
    expect(atualizarUsuarioSchema.safeParse({}).success).toBe(false);
    expect(atualizarPerfilUsuarioSchema.safeParse({ role_id: 'perfil-invalido' }).success).toBe(false);
  });

  it('valida payload de interação e rejeita data fora do formato', () => {
    expect(
      criarInteracaoSchema.safeParse({
        registrado_por: uuid,
        tipo: 'visita',
        descricao: 'Visita registrada',
        data: '2026-06-10',
      }).success
    ).toBe(true);
    expect(
      criarInteracaoSchema.safeParse({
        registrado_por: uuid,
        tipo: 'visita',
        descricao: 'Visita registrada',
        data: '10/06/2026',
      }).success
    ).toBe(false);
  });
});
