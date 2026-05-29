import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, lerUsuario, ids } from './helpers/usuarios';

const EMAIL = 'itg.ctrl.inativa@atvos.test';
const ADMIN = { Authorization: 'Bearer token-valido', 'x-user-role': 'administrador' };

let perfis: Record<string, string>;
let usuarioId: string;

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.administrador, ativo: true });
  usuarioId = u.id;
});

afterEach(async () => {
  await removerUsuarioPorEmail(EMAIL);
});

afterAll(async () => {
  await pool.end();
});

describe('PUT /usuarios/:id/inativar (integração com banco real)', () => {
  it('responde 200 quando admin inativa usuario existente e persiste ativo=false', async () => {
    const res = await request(app).put(`/usuarios/${usuarioId}/inativar`).set(ADMIN).send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe('Acesso revogado e historico preservado');
    expect(res.body.usuario.ativo).toBe(false);

    const salvo = await lerUsuario(usuarioId);
    expect(salvo?.ativo).toBe(false);
  });

  it('responde 401 quando o token estiver ausente', async () => {
    const res = await request(app)
      .put(`/usuarios/${usuarioId}/inativar`)
      .set('x-user-role', 'administrador')
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token invalido ou ausente');

    const salvo = await lerUsuario(usuarioId);
    expect(salvo?.ativo).toBe(true);
  });

  it('responde 403 quando o usuario nao for administrador', async () => {
    const res = await request(app)
      .put(`/usuarios/${usuarioId}/inativar`)
      .set({ Authorization: 'Bearer token-valido', 'x-user-role': 'coordenador' })
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Usuario sem permissao de administrador');

    const salvo = await lerUsuario(usuarioId);
    expect(salvo?.ativo).toBe(true);
  });

  it('responde 404 quando o usuario nao existir', async () => {
    const res = await request(app).put(`/usuarios/${ids.inexistente}/inativar`).set(ADMIN).send();

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario nao encontrado');
  });

  it('responde 500 quando ocorre erro inesperado de banco (uuid malformado)', async () => {
    const res = await request(app).put(`/usuarios/${ids.malformado}/inativar`).set(ADMIN).send();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Erro interno do servidor');
  });
});
