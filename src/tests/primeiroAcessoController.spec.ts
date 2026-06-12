import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail } from './helpers/usuarios';

const EMAIL = 'itg.ctrl.primeiroacesso@atvos.test';

let perfis: Record<string, string>;
let usuarioId: string;

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  // criarUsuario nao define senha: senha_hash fica NULL, usuario elegivel ao primeiro acesso
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista });
  usuarioId = u.id;
});

afterEach(async () => {
  await pool.query('DELETE FROM primeiro_acesso_tokens WHERE usuario_id = $1', [usuarioId]);
  await removerUsuarioPorEmail(EMAIL);
});

afterAll(async () => {
  await pool.end();
});

describe('POST /primeiro-acesso/solicitar (integração com banco real)', () => {
  // CT51 → RN02 (RF011): usuário ativo sem senha recebe token de primeiro acesso
  it('emite token de primeiro acesso para usuário ativo sem senha', async () => {
    const res = await request(app).post('/primeiro-acesso/solicitar').send({ email: EMAIL });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token).toHaveLength(64);
    expect(res.body.expira_em).toBeDefined();

    const hash = createHash('sha256').update(res.body.token).digest('hex');
    const { rows } = await pool.query(
      `SELECT usado_em, expira_em FROM primeiro_acesso_tokens
        WHERE usuario_id = $1 AND token_hash = $2`,
      [usuarioId, hash]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].usado_em).toBeNull();
    expect(new Date(rows[0].expira_em).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('POST /primeiro-acesso/definir-senha (integração com banco real)', () => {
  // CT52 → RN02 (RF011): token válido define a senha (hash bcrypt) e é marcado como usado
  it('define a senha via token, grava hash bcrypt e marca o token como usado', async () => {
    const solicitacao = await request(app).post('/primeiro-acesso/solicitar').send({ email: EMAIL });
    const token = solicitacao.body.token as string;

    const res = await request(app).post('/primeiro-acesso/definir-senha').send({
      token,
      senha: 'NovaSenha@123',
      confirmacao_senha: 'NovaSenha@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe('Senha cadastrada com sucesso');

    const usuario = await pool.query<{ senha_hash: string | null }>(
      'SELECT senha_hash FROM usuarios WHERE id = $1',
      [usuarioId]
    );
    expect(usuario.rows[0].senha_hash).not.toBeNull();
    expect(usuario.rows[0].senha_hash).not.toBe('NovaSenha@123');
    expect(await bcrypt.compare('NovaSenha@123', usuario.rows[0].senha_hash as string)).toBe(true);

    const hash = createHash('sha256').update(token).digest('hex');
    const tokenSalvo = await pool.query<{ usado_em: Date | null }>(
      'SELECT usado_em FROM primeiro_acesso_tokens WHERE token_hash = $1',
      [hash]
    );
    expect(tokenSalvo.rows[0].usado_em).not.toBeNull();
  });
});

describe('primeiro acesso — falhas de contrato (400)', () => {
  // CT59 → RN02 (RF011): payload malformado é barrado pelo schema antes de tocar o banco
  it('rejeita solicitação sem e-mail e não emite token', async () => {
    const res = await request(app).post('/primeiro-acesso/solicitar').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('E-mail obrigatório');

    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM primeiro_acesso_tokens WHERE usuario_id = $1',
      [usuarioId]
    );
    expect(rows[0].total).toBe(0);
  });

  it('rejeita senha com menos de 8 caracteres e mantém o usuário sem senha', async () => {
    const solicitacao = await request(app).post('/primeiro-acesso/solicitar').send({ email: EMAIL });

    const res = await request(app).post('/primeiro-acesso/definir-senha').send({
      token: solicitacao.body.token,
      senha: '1234567',
      confirmacao_senha: '1234567',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Senha deve ter pelo menos 8 caracteres');

    const usuario = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [usuarioId]);
    expect(usuario.rows[0].senha_hash).toBeNull();
  });

  it('rejeita quando senha e confirmação não coincidem', async () => {
    const solicitacao = await request(app).post('/primeiro-acesso/solicitar').send({ email: EMAIL });

    const res = await request(app).post('/primeiro-acesso/definir-senha').send({
      token: solicitacao.body.token,
      senha: 'NovaSenha@123',
      confirmacao_senha: 'OutraSenha@123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Senhas não coincidem');
  });

  it('rejeita definição de senha sem token', async () => {
    const res = await request(app).post('/primeiro-acesso/definir-senha').send({
      senha: 'NovaSenha@123',
      confirmacao_senha: 'NovaSenha@123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Token obrigatório');
  });
});

describe('primeiro acesso — usuário não encontrado (404)', () => {
  // CT67 → RN02 (RF011): e-mail bem formado porém sem usuário elegível retorna não encontrado
  it('responde 404 ao solicitar token para e-mail sem usuário cadastrado', async () => {
    const res = await request(app)
      .post('/primeiro-acesso/solicitar')
      .send({ email: 'fantasma.inexistente@atvos.test' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuário não elegível para primeiro acesso');
  });
});
