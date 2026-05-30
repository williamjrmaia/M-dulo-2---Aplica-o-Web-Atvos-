import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

const UUID_INEXISTENTE = '00000000-0000-0000-0000-0000000000ff';
let testUserId: string;

const parceirosCriados = new Set<string>();

beforeEach(async () => {
  testUserId = randomUUID();
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, $3, $4, true)`,
    [testUserId, rows[0].id, 'Usuario Teste Detalhe', `detalhe_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  const parceiroIds = Array.from(parceirosCriados);

  if (parceiroIds.length > 0) {
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [parceiroIds]);
  }

  await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
  parceirosCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiro(status = 'ativo') {
  const { rows } = await pool.query<{
    id: string;
    nome: string;
    tipo_pessoa: string;
    cpf_cnpj: string;
    criado_por: string;
  }>(
    `INSERT INTO parceiros (nome, apelido, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6::status_validacao, $7)
     RETURNING *`,
    [
      `Parceiro Detalhe ${randomUUID()}`,
      'Detalhe',
      'fisica',
      randomUUID(),
      `parceiro_${randomUUID()}@atvos.test`,
      status,
      testUserId,
    ]
  );

  parceirosCriados.add(rows[0].id);
  return rows[0];
}

describe('GET /api/parceiros/:id', () => {
  it('Caso 1 — retorna os dados do parceiro correspondente ao ID informado', async () => {
    const parceiro = await criarParceiro();

    const res = await request(app).get(`/api/parceiros/${parceiro.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(parceiro.id);
    expect(res.body.nome).toBe(parceiro.nome);
    expect(res.body.tipo_pessoa).toBe(parceiro.tipo_pessoa);
    expect(res.body.cpf_cnpj).toBe(parceiro.cpf_cnpj);
  });

  it('Caso 2 — parceiro inexistente → 404', async () => {
    const res = await request(app).get(`/api/parceiros/${UUID_INEXISTENTE}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Parceiro não encontrado');
  });

  it('Caso 3 — ID com formato inválido → 404', async () => {
    const res = await request(app).get('/api/parceiros/invalid-uuid');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Parceiro não encontrado');
  });

  it('Caso 4 — parceiro inativo não aparece na consulta operacional', async () => {
    const parceiro = await criarParceiro('inativo');

    const res = await request(app).get(`/api/parceiros/${parceiro.id}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Parceiro não encontrado');
  });
});
