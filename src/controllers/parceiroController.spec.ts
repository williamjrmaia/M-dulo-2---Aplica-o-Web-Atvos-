import request from 'supertest';
import app from '../app';
import pool from '../db/pool';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

beforeEach(async () => {
  await pool.query('DELETE FROM parceiros');
  await pool.query('DELETE FROM usuarios WHERE id = $1', [SEED_USER_ID]);
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, 'Admin', 'admin@test.com', true)`,
    [SEED_USER_ID, rows[0].id]
  );
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/parceiros', () => {
  it('Caso 1 — campos mínimos válidos → 201, status rascunho, criado_em presente', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send({
        nome: 'João da Silva',
        tipo_pessoa: 'fisica',
        cpf_cnpj: '12345678901',
        criado_por: SEED_USER_ID,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('rascunho');
    expect(res.body.criado_em).toBeDefined();
    expect(res.body.id).toBeDefined();
  });

  it('Caso 2 — RN09: cpf_cnpj duplicado → 409', async () => {
    await request(app)
      .post('/api/parceiros')
      .send({ nome: 'João', tipo_pessoa: 'fisica', cpf_cnpj: '11111111111', criado_por: SEED_USER_ID });

    const res = await request(app)
      .post('/api/parceiros')
      .send({ nome: 'Maria', tipo_pessoa: 'fisica', cpf_cnpj: '11111111111', criado_por: SEED_USER_ID });

    expect(res.status).toBe(409);
  });

  it('Caso 3 — payload inválido: tipo_pessoa fora do ENUM → 400', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send({
        nome: 'João da Silva',
        tipo_pessoa: 'empresa',
        cpf_cnpj: '99999999999',
        criado_por: SEED_USER_ID,
      });

    expect(res.status).toBe(400);
  });

  it('Caso 4 — persistência: SELECT confirma status rascunho e criado_por correto', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send({
        nome: 'Teste Persistência',
        tipo_pessoa: 'juridica',
        cpf_cnpj: '00000000000191',
        criado_por: SEED_USER_ID,
      });

    expect(res.status).toBe(201);

    const { rows } = await pool.query('SELECT * FROM parceiros WHERE id = $1', [res.body.id]);
    expect(rows[0].status).toBe('rascunho');
    expect(rows[0].criado_por).toBe(SEED_USER_ID);
  });
});
