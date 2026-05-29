import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, lerUsuario, ids } from './helpers/usuarios';

const EMAIL = 'itg.ctrl.update@atvos.test';
const EMAIL_EDITADO = 'itg.ctrl.update.editado@atvos.test';

let perfis: Record<string, string>;
let usuarioId: string;

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista, nome: 'Usuario Atual' });
  usuarioId = u.id;
});

afterEach(async () => {
  await removerUsuarioPorEmail(EMAIL);
  await removerUsuarioPorEmail(EMAIL_EDITADO);
});

afterAll(async () => {
  await pool.end();
});

describe('PUT /usuarios/:id (integração com banco real)', () => {
  it('responde 200 e persiste os novos dados', async () => {
    const res = await request(app)
      .put(`/usuarios/${usuarioId}`)
      .send({ nome: 'Usuario Editado', email: EMAIL_EDITADO });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe('Dados atualizados com governanca');
    expect(res.body.usuario.nome).toBe('Usuario Editado');

    const salvo = await lerUsuario(usuarioId);
    expect(salvo?.nome).toBe('Usuario Editado');
    expect(salvo?.email).toBe(EMAIL_EDITADO);
  });

  it('responde 400 quando o payload for invalido', async () => {
    const res = await request(app)
      .put(`/usuarios/${usuarioId}`)
      .send({ email: 'email-invalido' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Dados de entrada invalidos');
  });

  it('responde 404 quando o usuario nao existir', async () => {
    const res = await request(app)
      .put(`/usuarios/${ids.inexistente}`)
      .send({ nome: 'Novo Nome' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario nao localizado na base');
  });

  it('responde 500 quando ocorre erro inesperado de banco (uuid malformado)', async () => {
    const res = await request(app)
      .put(`/usuarios/${ids.malformado}`)
      .send({ nome: 'Novo Nome' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Erro interno do servidor');
  });
});
