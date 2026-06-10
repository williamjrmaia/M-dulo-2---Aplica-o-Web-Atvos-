import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, ids } from './helpers/usuarios';

const service = new UserService(new UserRepository());
const EMAIL = 'itg.svc.perfil@atvos.test';

let perfis: Record<string, string>;
let usuarioId: string;

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista });
  usuarioId = u.id;
});

afterEach(async () => {
  await pool.query(
    `DELETE FROM registro_alteracao
      WHERE entidade_id = $1
         OR usuario_id = $1
         OR aprovado_por = $1`,
    [usuarioId]
  );
  await removerUsuarioPorEmail(EMAIL);
});

afterAll(async () => {
  await pool.end();
});

describe('UserService.listarPerfis / listarUsuarios / buscarUsuario', () => {
  it('lista os perfis de acesso cadastrados', async () => {
    const lista = await service.listarPerfis();
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.length).toBeGreaterThan(0);
  });

  it('lista os usuarios cadastrados incluindo o usuario criado', async () => {
    const lista = await service.listarUsuarios();
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.some((u) => u.id === usuarioId)).toBe(true);
  });

  it('retorna usuario existente por id', async () => {
    const resultado = await service.buscarUsuario(usuarioId);
    expect(resultado).not.toBeNull();
    expect(resultado?.id).toBe(usuarioId);
  });

  it('retorna null para usuario inexistente', async () => {
    const resultado = await service.buscarUsuario(ids.inexistente);
    expect(resultado).toBeNull();
  });
});

describe('UserService.cadastraUsuario — validacoes de entrada', () => {
  it('rejeita cadastro com email invalido', async () => {
    await expect(
      service.cadastraUsuario({
        nome: 'Teste',
        email: 'email-invalido',
        perfil_acesso_id: perfis.analista,
      })
    ).rejects.toThrow('Dados de entrada invalidos');
  });
});

describe('UserService.atualizaUsuario — branches de validacao', () => {
  it('rejeita quando nenhum campo for informado', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, {})
    ).rejects.toThrow('Dados de entrada invalidos');
  });

  it('rejeita quando nome for string vazia', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, { nome: '' })
    ).rejects.toThrow('Dados de entrada invalidos');
  });

  it('rejeita quando ativo nao for boolean', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, { ativo: 'sim' as unknown as boolean })
    ).rejects.toThrow('Dados de entrada invalidos');
  });
});

describe('UserService.atualizaPerfilDeAcesso (integração com banco real)', () => {
  it('atualiza o perfil quando o perfil existe e persiste no banco', async () => {
    const resultado = await service.atualizaPerfilDeAcesso(usuarioId, perfis.coordenador);

    expect(resultado.perfil_acesso_id).toBe(perfis.coordenador);
    const { rows } = await pool.query('SELECT perfil_acesso_id FROM usuarios WHERE id = $1', [usuarioId]);
    expect(rows[0].perfil_acesso_id).toBe(perfis.coordenador);
  });

  it('bloqueia a atualizacao quando o perfil nao existe', async () => {
    await expect(
      service.atualizaPerfilDeAcesso(usuarioId, ids.inexistente)
    ).rejects.toThrow('Perfil nao encontrado');
  });

  it('valida campos obrigatorios antes de consultar o banco', async () => {
    await expect(service.atualizaPerfilDeAcesso(usuarioId, '')).rejects.toThrow('Dados obrigatorios ausentes');
  });

  it('informa quando o usuario nao existe', async () => {
    await expect(
      service.atualizaPerfilDeAcesso(ids.inexistente, perfis.coordenador)
    ).rejects.toThrow('Usuario nao encontrado');
  });
});
