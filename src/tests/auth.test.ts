import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../server';
import pool from '../config/connection';

// ─── Controle de dados criados nos testes ───
const usuariosCriados = new Set<string>();

// ─── Helpers ────────────────────────────────
const criarUsuario = async (
  email: string,
  senha: string,
): Promise<string> => {
  const perfilResult = await pool.query<{ id: string }>(
    `SELECT id FROM perfil_acesso WHERE nome = 'analista' LIMIT 1`,
  );
  const perfilId = perfilResult.rows[0].id;

  const senhaHash = await bcrypt.hash(senha, 10);

  const result = await pool.query<{ id: string }>(
    `INSERT INTO usuarios (perfil_acesso_id, nome, email, senha_hash, ativo)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id`,
    [perfilId, 'Usuário Teste', email, senhaHash],
  );

  const id = result.rows[0].id;
  usuariosCriados.add(id);
  return id;
};

const limparDadosDeTeste = async (): Promise<void> => {
  const ids = Array.from(usuariosCriados);

  if (ids.length > 0) {
    await pool.query(
      `DELETE FROM auth_sessoes WHERE usuario_id = ANY($1::uuid[])`,
      [ids],
    );
    await pool.query(
      `DELETE FROM usuarios WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    usuariosCriados.clear();
  }
};

// ─── Suite ──────────────────────────────────
describe('POST /login — Fluxo 03 Login de Usuário', () => {
  beforeEach(async () => {
    await limparDadosDeTeste();
    await criarUsuario('teste@atvos.com', 'Senha@123');
  });

  afterAll(async () => {
    await limparDadosDeTeste();
    await pool.end();
  });

  // T01 — Fluxo principal: sucesso
  it('deve retornar 200 e um token JWT com credenciais válidas', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'teste@atvos.com', senha: 'Senha@123' })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(10);
  });

  // T02 — Fluxo alternativo 1: credenciais inválidas
  it('deve retornar 401 quando a senha estiver incorreta', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'teste@atvos.com', senha: 'SenhaErrada999' })
      .expect(401);

    expect(response.body).toEqual({
      error: 'Credenciais inválidas',
    });
  });

  // T03 — Fluxo alternativo 2: usuário não existe
  it('deve retornar 404 quando o e-mail não estiver cadastrado', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'naoexiste@atvos.com', senha: 'Senha@123' })
      .expect(404);

    expect(response.body).toEqual({
      error: 'Usuário não cadastrado',
    });
  });

  // T04 — Validação de formato: payload inválido
  it('deve retornar 400 quando e-mail ou senha estiverem ausentes', async () => {
    const resSemSenha = await request(app)
      .post('/login')
      .send({ email: 'teste@atvos.com' })
      .expect(400);

    expect(resSemSenha.body).toEqual({
      error: 'E-mail e senha são obrigatórios',
    });

    const resSemEmail = await request(app)
      .post('/login')
      .send({ senha: 'Senha@123' })
      .expect(400);

    expect(resSemEmail.body).toEqual({
      error: 'E-mail e senha são obrigatórios',
    });
  });

  // T05 — Verificação de persistência no banco
  it('deve persistir o usuário com senha hasheada no banco', async () => {
    const result = await pool.query<{ id: string; email: string; senha_hash: string }>(
      `SELECT id, email, senha_hash FROM usuarios WHERE email = $1`,
      ['teste@atvos.com'],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe('teste@atvos.com');

    // Senha não pode estar em texto puro
    expect(result.rows[0].senha_hash).not.toBe('Senha@123');

    // bcrypt deve validar a senha correta
    const senhaValida = await bcrypt.compare('Senha@123', result.rows[0].senha_hash);
    expect(senhaValida).toBe(true);
  });
});
