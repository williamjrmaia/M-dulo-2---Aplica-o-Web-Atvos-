import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';
const UUID_INEXISTENTE = '00000000-0000-0000-0000-0000000000ff';

const terraValida = () => ({
  nome: 'Fazenda Santa Maria',
  area_contratada_ha: 150.5,
  cidade: 'Ribeirão Preto',
  estado: 'SP',
  criado_por: SEED_USER_ID,
});

beforeEach(async () => {
  await pool.query('DELETE FROM terras');
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

describe('POST /api/terras', () => {
  it('Caso 1 — campos válidos → 201, status rascunho, Location e criado_em presentes', async () => {
    const res = await request(app).post('/api/terras').send(terraValida());

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^\/api\/terras\/[0-9a-f-]{36}$/);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('rascunho');
    expect(res.body.criado_em).toBeDefined();
    expect(Number(res.body.area_contratada_ha)).toBe(150.5);
  });

  it('Caso 2 — nome ausente → 400', async () => {
    const { nome, ...semNome } = terraValida();
    const res = await request(app).post('/api/terras').send(semNome);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nome/);
  });

  it('Caso 3 — area_contratada_ha não positiva → 400 (CHECK area > 0)', async () => {
    const res = await request(app)
      .post('/api/terras')
      .send({ ...terraValida(), area_contratada_ha: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/area_contratada_ha/);
  });

  it('Caso 4 — estado com tamanho inválido → 400', async () => {
    const res = await request(app)
      .post('/api/terras')
      .send({ ...terraValida(), estado: 'São Paulo' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/estado/);
  });

  it('Caso 5 — criado_por inexistente (FK) → 422', async () => {
    const res = await request(app)
      .post('/api/terras')
      .send({ ...terraValida(), criado_por: UUID_INEXISTENTE });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/criado_por/);
  });

  it('Caso 6 — persistência: dados salvos conferem com o banco', async () => {
    const res = await request(app).post('/api/terras').send(terraValida());

    const { rows } = await pool.query('SELECT * FROM terras WHERE id = $1', [res.body.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].nome).toBe('Fazenda Santa Maria');
    expect(rows[0].cidade).toBe('Ribeirão Preto');
    expect(rows[0].estado).toBe('SP');
    expect(rows[0].criado_por).toBe(SEED_USER_ID);
  });
});
