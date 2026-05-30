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
    [testUserId, rows[0].id, 'Usuario Teste Historico', `historico_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  const parceiroIds = Array.from(parceirosCriados);

  if (parceiroIds.length > 0) {
    await pool.query(
      `DELETE FROM registro_alteracao
        WHERE usuario_id = $1
           OR aprovado_por = $1
           OR entidade_id = ANY($2::uuid[])`,
      [testUserId, parceiroIds]
    );
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [parceiroIds]);
  } else {
    await pool.query(`DELETE FROM registro_alteracao WHERE usuario_id = $1 OR aprovado_por = $1`, [testUserId]);
  }

  await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
  parceirosCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiro() {
  const { rows } = await pool.query<{ id: string; nome: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, $2, $3, $4, 'ativo', $5)
     RETURNING *`,
    [
      `Parceiro Historico ${randomUUID()}`,
      'fisica',
      randomUUID(),
      `parceiro_${randomUUID()}@atvos.test`,
      testUserId,
    ]
  );

  parceirosCriados.add(rows[0].id);
  return rows[0];
}

async function criarRegistro(params: {
  parceiroId: string;
  tipoOperacao: string;
  dataAlteracao: string;
  entidadeAfetada?: string;
  comentario?: string;
}) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO registro_alteracao
       (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario, data_alteracao)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'aprovado', $7, $8)
     RETURNING id`,
    [
      testUserId,
      params.entidadeAfetada ?? 'parceiro',
      params.parceiroId,
      params.tipoOperacao,
      JSON.stringify({ nome: 'valor anterior' }),
      JSON.stringify({ nome: 'valor novo' }),
      params.comentario ?? null,
      params.dataAlteracao,
    ]
  );

  return rows[0].id;
}

describe('GET /api/parceiros/:id/historico', () => {
  it('Caso 1 — retorna histórico do parceiro em ordem cronológica decrescente', async () => {
    const parceiro = await criarParceiro();
    const antigo = await criarRegistro({
      parceiroId: parceiro.id,
      tipoOperacao: 'criacao',
      dataAlteracao: '2026-01-01T10:00:00Z',
    });
    const recente = await criarRegistro({
      parceiroId: parceiro.id,
      tipoOperacao: 'edicao',
      dataAlteracao: '2026-01-02T10:00:00Z',
    });

    const res = await request(app).get(`/api/parceiros/${parceiro.id}/historico`);

    expect(res.status).toBe(200);
    expect(res.body.map((registro: { id: string }) => registro.id)).toEqual([recente, antigo]);
  });

  it('Caso 2 — ignora registros de outras entidades mesmo com o mesmo UUID', async () => {
    const parceiro = await criarParceiro();
    const registroParceiro = await criarRegistro({
      parceiroId: parceiro.id,
      tipoOperacao: 'edicao',
      dataAlteracao: '2026-01-02T10:00:00Z',
      entidadeAfetada: 'parceiro',
    });
    await criarRegistro({
      parceiroId: parceiro.id,
      tipoOperacao: 'edicao',
      dataAlteracao: '2026-01-03T10:00:00Z',
      entidadeAfetada: 'terra',
    });

    const res = await request(app).get(`/api/parceiros/${parceiro.id}/historico`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(registroParceiro);
  });

  it('Caso 3 — parceiro existente sem histórico → 200 com array vazio', async () => {
    const parceiro = await criarParceiro();

    const res = await request(app).get(`/api/parceiros/${parceiro.id}/historico`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('Caso 4 — parceiro inexistente ou ID inválido → 404', async () => {
    const inexistente = await request(app).get(`/api/parceiros/${UUID_INEXISTENTE}/historico`);
    const invalido = await request(app).get('/api/parceiros/invalid-uuid/historico');

    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error).toBe('Parceiro não encontrado');
    expect(invalido.status).toBe(404);
    expect(invalido.body.error).toBe('Parceiro não encontrado');
  });
});
