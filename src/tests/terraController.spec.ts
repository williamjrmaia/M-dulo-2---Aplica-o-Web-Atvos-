import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

const UUID_INEXISTENTE = '00000000-0000-0000-0000-0000000000ff';
let testUserId: string;

const terraValida = () => ({
  nome: 'Fazenda Santa Maria',
  area_contratada_ha: 150.5,
  cidade: 'Ribeirão Preto',
  estado: 'SP',
  criado_por: testUserId,
});

beforeEach(async () => {
  testUserId = randomUUID();
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, $3, $4, true)`,
    [testUserId, rows[0].id, 'Usuario Teste Terras', `terras_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  await pool.query('DELETE FROM terras WHERE criado_por = $1', [testUserId]);
  await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
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
    expect(rows[0].criado_por).toBe(testUserId);
  });
});

describe('GET /api/terras', () => {
  it('Caso 1 — retorna 200 com a lista de terras cadastradas não inativas', async () => {
    await request(app).post('/api/terras').send({
      ...terraValida(),
      nome: 'Fazenda Santa Maria',
    });
    await request(app).post('/api/terras').send({
      ...terraValida(),
      nome: 'Fazenda Boa Vista',
      cidade: 'Sertãozinho',
    });

    const res = await request(app).get('/api/terras');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map((terra: { nome: string }) => terra.nome)).toEqual(
      expect.arrayContaining(['Fazenda Santa Maria', 'Fazenda Boa Vista'])
    );
  });

  it('Caso 2 — retorna array mesmo quando o banco compartilhado tem estado variável', async () => {
    const res = await request(app).get('/api/terras');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('Caso 3 — não inclui terras com status inativo na listagem padrão', async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO terras (nome, area_contratada_ha, cidade, estado, status, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['Fazenda Inativa', 90, 'Sertãozinho', 'SP', 'inativo', testUserId]
    );

    const res = await request(app).get('/api/terras');

    expect(res.status).toBe(200);
    expect(res.body.map((terra: { id: string }) => terra.id)).not.toContain(rows[0].id);
  });

  it('Caso 4 — retorna dados que conferem com o banco', async () => {
    const criado = await request(app).post('/api/terras').send(terraValida());

    const res = await request(app).get('/api/terras');
    const { rows } = await pool.query('SELECT nome, cidade, estado FROM terras WHERE id = $1', [
      criado.body.id,
    ]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: criado.body.id,
          nome: rows[0].nome,
          cidade: rows[0].cidade,
          estado: rows[0].estado,
        }),
      ])
    );
  });
});
