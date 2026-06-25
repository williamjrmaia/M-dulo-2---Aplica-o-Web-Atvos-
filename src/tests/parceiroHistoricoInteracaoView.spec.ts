import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

// Regressão #475: a tela de detalhe do parceiro deve exibir as interações
// registradas no "Histórico de Interações" (antes o card ficava sempre vazio
// porque o render não carregava a tabela `interacao`).

let testUserId: string;
const parceirosCriados = new Set<string>();

beforeEach(async () => {
  testUserId = randomUUID();
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM perfil_acesso WHERE nome = 'analista'`
  );
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, $3, $4, true)`,
    [testUserId, rows[0].id, 'Usuario Historico Interacao', `hist_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  const parceiroIds = Array.from(parceirosCriados);
  if (parceiroIds.length > 0) {
    await pool.query(`DELETE FROM interacao WHERE parceiro_id = ANY($1::uuid[])`, [parceiroIds]);
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [parceiroIds]);
  }
  await pool.query('DELETE FROM interacao WHERE registrado_por = $1', [testUserId]);
  await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
  parceirosCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiro() {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, 'fisica', $2, $3, 'ativo'::status_validacao, $4)
     RETURNING id`,
    [`Parceiro Hist ${randomUUID()}`, randomUUID(), `p_${randomUUID()}@atvos.test`, testUserId]
  );
  parceirosCriados.add(rows[0].id);
  return rows[0].id;
}

async function criarInteracao(parceiroId: string, descricao: string) {
  await pool.query(
    `INSERT INTO interacao (parceiro_id, registrado_por, tipo, descricao, data)
     VALUES ($1, $2, $3, $4, $5)`,
    [parceiroId, testUserId, 'Visita', descricao, '2026-01-20']
  );
}

describe('GET /parceiros/:id — Histórico de Interações (view)', () => {
  it('exibe a interação registrada no histórico (e não o estado vazio)', async () => {
    const parceiroId = await criarParceiro();
    const descricao = `Visita tecnica ${randomUUID()}`;
    await criarInteracao(parceiroId, descricao);

    const res = await request(app).get(`/parceiros/${parceiroId}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain(descricao);
    expect(res.text).not.toContain('Nenhuma interação registrada');
  });

  it('mostra o estado vazio quando o parceiro não tem interações', async () => {
    const parceiroId = await criarParceiro();

    const res = await request(app).get(`/parceiros/${parceiroId}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Nenhuma interação registrada');
  });
});
