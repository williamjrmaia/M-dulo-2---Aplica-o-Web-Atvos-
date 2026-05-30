import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { garantirPerfis, ids } from './helpers/usuarios';

let perfis: Record<string, string>;
const emailsCriados = new Set<string>();

beforeAll(async () => {
  perfis = await garantirPerfis();
});

afterEach(async () => {
  for (const email of emailsCriados) {
    await pool.query('DELETE FROM usuarios WHERE email = $1', [email]);
  }
  emailsCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

const emailTeste = (sufixo: string) => `cadastro_${sufixo}_${Date.now()}@atvos.test`;

describe('POST /api/usuarios', () => {
  it('Caso 1 — cria usuário ativo sem senha e persiste no banco', async () => {
    const email = emailTeste('sucesso');
    emailsCriados.add(email);

    const res = await request(app).post('/api/usuarios').send({
      nome: 'Usuario Cadastro',
      email,
      perfil_acesso_id: perfis.analista,
    });

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^\/api\/usuarios\/[0-9a-f-]{36}$/);
    expect(res.body.id).toBeDefined();
    expect(res.body.nome).toBe('Usuario Cadastro');
    expect(res.body.email).toBe(email);
    expect(res.body.ativo).toBe(true);
    expect(res.body.senha_hash).toBeNull();

    const { rows } = await pool.query(
      `SELECT nome, email, senha_hash, ativo, perfil_acesso_id
         FROM usuarios
        WHERE id = $1`,
      [res.body.id]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        nome: 'Usuario Cadastro',
        email,
        senha_hash: null,
        ativo: true,
        perfil_acesso_id: perfis.analista,
      })
    );
  });

  it('Caso 2 — rejeita e-mail duplicado com 409', async () => {
    const email = emailTeste('duplicado');
    emailsCriados.add(email);

    await request(app).post('/api/usuarios').send({
      nome: 'Usuario Original',
      email,
      perfil_acesso_id: perfis.analista,
    });

    const res = await request(app).post('/api/usuarios').send({
      nome: 'Usuario Duplicado',
      email,
      perfil_acesso_id: perfis.coordenador,
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email ja cadastrado');
  });

  it('Caso 3 — rejeita payload obrigatório inválido com 400', async () => {
    const resSemNome = await request(app).post('/api/usuarios').send({
      email: emailTeste('sem_nome'),
      perfil_acesso_id: perfis.analista,
    });
    const resEmailInvalido = await request(app).post('/api/usuarios').send({
      nome: 'Usuario Email Invalido',
      email: 'email-invalido',
      perfil_acesso_id: perfis.analista,
    });

    expect(resSemNome.status).toBe(400);
    expect(resSemNome.body.error).toBe('Dados de entrada invalidos');
    expect(resEmailInvalido.status).toBe(400);
    expect(resEmailInvalido.body.error).toBe('Dados de entrada invalidos');
  });

  it('Caso 4 — rejeita perfil inexistente com 422', async () => {
    const email = emailTeste('perfil');
    emailsCriados.add(email);

    const res = await request(app).post('/api/usuarios').send({
      nome: 'Usuario Perfil Inexistente',
      email,
      perfil_acesso_id: ids.inexistente,
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Perfil nao encontrado');
  });
});
