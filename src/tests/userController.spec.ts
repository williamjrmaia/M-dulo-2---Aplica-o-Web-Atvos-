import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, lerUsuario, ids } from './helpers/usuarios';

const EMAIL = 'itg.ctrl.perfil@atvos.test';

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
  await removerUsuarioPorEmail(EMAIL);
});

afterAll(async () => {
  await pool.end();
});

describe('PUT /usuarios/:id/perfil (integração com banco real)', () => {
  it('responde 200 e persiste o novo perfil', async () => {
    const res = await request(app)
      .put(`/usuarios/${usuarioId}/perfil`)
      .send({ role_id: perfis.coordenador });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe('Perfil de acesso atualizado');
    expect(res.body.usuario.perfil_acesso_id).toBe(perfis.coordenador);

    const salvo = await lerUsuario(usuarioId);
    expect(salvo?.perfil_acesso_id).toBe(perfis.coordenador);
  });

  it('responde 400 quando o perfil nao existir', async () => {
    const res = await request(app)
      .put(`/usuarios/${usuarioId}/perfil`)
      .send({ role_id: ids.inexistente });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Perfil nao encontrado');
  });

  it('responde 404 quando o usuario nao existir', async () => {
    const res = await request(app)
      .put(`/usuarios/${ids.inexistente}/perfil`)
      .send({ role_id: perfis.coordenador });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario nao encontrado');
  });

  it('responde 500 quando ocorre erro inesperado de banco (uuid malformado)', async () => {
    const res = await request(app)
      .put(`/usuarios/${usuarioId}/perfil`)
      .send({ role_id: ids.malformado });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Erro interno do servidor');
  });
});
