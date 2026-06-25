import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

// Regressão #478: a reestruturação do controle de status no formulário de edição
// não pode quebrar a renderização da página. (O botão explícito "Enviar para
// validação" é exclusivo do perfil analista e validado manualmente com app + login,
// pois o perfil não é populado em res.locals no modo de teste.)

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
    [testUserId, rows[0].id, 'Usuario Edit Status', `editstatus_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  const ids = Array.from(parceirosCriados);
  if (ids.length > 0) {
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [ids]);
  }
  await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
  parceirosCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiro(status = 'rascunho') {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, 'fisica', $2, $3, $4::status_validacao, $5)
     RETURNING id`,
    [`Parceiro Edit ${randomUUID()}`, randomUUID(), `p_${randomUUID()}@atvos.test`, status, testUserId]
  );
  parceirosCriados.add(rows[0].id);
  return rows[0].id;
}

describe('GET /parceiros/:id/editar — render do controle de status', () => {
  it('renderiza o formulário de edição com o controle de status e o botão Salvar', async () => {
    const id = await criarParceiro('rascunho');

    const res = await request(app).get(`/parceiros/${id}/editar`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('name="status"');
    expect(res.text).toContain('Salvar Alterações');
    expect(res.text).toContain('action="/parceiros/' + id + '/editar"');
  });
});
