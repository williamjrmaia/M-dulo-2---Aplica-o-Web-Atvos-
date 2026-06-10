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
