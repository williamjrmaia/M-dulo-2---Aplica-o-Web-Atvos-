import bcrypt from 'bcryptjs';
import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../app';
import pool from '../config/connection';

const UUID_INEXISTENTE = '00000000-0000-0000-0000-0000000000ff';
const usuariosCriados = new Set<string>();
const sessoesCriadas = new Set<string>();

beforeEach(async () => {
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
});

afterEach(async () => {
  const usuarioIds = Array.from(usuariosCriados);
  const sessaoIds = Array.from(sessoesCriadas);

  await pool.query(
    `DELETE FROM auth_sessoes
      WHERE usuario_id = ANY($1::uuid[])
         OR id = ANY($2::uuid[])`,
    [usuarioIds, sessaoIds]
  );

  if (usuarioIds.length > 0) {
    await pool.query(`DELETE FROM usuarios WHERE id = ANY($1::uuid[])`, [usuarioIds]);
  }

  usuariosCriados.clear();
  sessoesCriadas.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarUsuarioComSenha(email: string, senha: string): Promise<string> {
  const perfil = await pool.query<{ id: string }>(`SELECT id FROM perfil_acesso WHERE nome = 'analista' LIMIT 1`);
  const senhaHash = await bcrypt.hash(senha, 10);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO usuarios (perfil_acesso_id, nome, email, senha_hash, ativo)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id`,
    [perfil.rows[0].id, 'Usuario Sessao', email, senhaHash]
  );

  usuariosCriados.add(rows[0].id);
  return rows[0].id;
}

async function loginComSessao() {
  const email = `sessao_${randomUUID()}@atvos.test`;
  const senha = 'Senha@123';
  await criarUsuarioComSenha(email, senha);

  const login = await request(app).post('/login').send({ email, senha });
  expect(login.status).toBe(200);
  expect(login.body.sessao.id).toBeDefined();

  sessoesCriadas.add(login.body.sessao.id);
  return login.body.sessao.id as string;
}

describe('PUT /auth/sessoes/:id', () => {
  it('Caso 1 — encerra sessão ativa e persiste revogação', async () => {
    const sessaoId = await loginComSessao();

    const res = await request(app).put(`/auth/sessoes/${sessaoId}`).send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe('Sessao encerrada');
    expect(res.body.sessao.id).toBe(sessaoId);
    expect(res.body.sessao.ativa).toBe(false);
    expect(res.body.sessao.revogada_em).toBeDefined();

    const { rows } = await pool.query(`SELECT ativa, revogada_em FROM auth_sessoes WHERE id = $1`, [sessaoId]);
    expect(rows[0].ativa).toBe(false);
    expect(rows[0].revogada_em).toBeDefined();
  });

  it('Caso 2 — não encerra duas vezes a mesma sessão', async () => {
    const sessaoId = await loginComSessao();

    await request(app).put(`/auth/sessoes/${sessaoId}`).send({});
    const res = await request(app).put(`/auth/sessoes/${sessaoId}`).send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Sessao ja encerrada');
  });

  it('Caso 3 — sessão inexistente ou ID inválido retorna 404', async () => {
    const inexistente = await request(app).put(`/auth/sessoes/${UUID_INEXISTENTE}`).send({});
    const invalido = await request(app).put('/auth/sessoes/id-invalido').send({});

    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error).toBe('Sessao nao encontrada');
    expect(invalido.status).toBe(404);
    expect(invalido.body.error).toBe('Sessao nao encontrada');
  });

  it('Caso 4 — rejeita revogador inexistente com 422', async () => {
    const sessaoId = await loginComSessao();

    const res = await request(app).put(`/auth/sessoes/${sessaoId}`).send({
      revogada_por: UUID_INEXISTENTE,
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Usuario revogador nao encontrado');
  });
});
