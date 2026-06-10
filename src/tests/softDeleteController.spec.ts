import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

let testUserId: string;
const parceiroIds = new Set<string>();
const terraIds = new Set<string>();

beforeEach(async () => {
  testUserId = randomUUID();
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo)
     VALUES ($1, $2, $3, $4, true)`,
    [testUserId, rows[0].id, 'Usuario Soft Delete', `soft_delete_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  const parceiros = Array.from(parceiroIds);
  const terras = Array.from(terraIds);

  await pool.query(
    `DELETE FROM registro_alteracao
      WHERE usuario_id = $1
         OR aprovado_por = $1
         OR entidade_id = ANY($2::uuid[])
         OR entidade_id = ANY($3::uuid[])`,
    [testUserId, parceiros, terras]
  );

  if (parceiros.length > 0 || terras.length > 0) {
    await pool.query(
      `DELETE FROM parceiro_terra
        WHERE parceiro_id = ANY($1::uuid[])
           OR terra_id = ANY($2::uuid[])`,
      [parceiros, terras]
    );
  }
  if (parceiros.length > 0) {
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [parceiros]);
  }
  if (terras.length > 0) {
    await pool.query(`DELETE FROM terras WHERE id = ANY($1::uuid[])`, [terras]);
  }

  await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
  parceiroIds.clear();
  terraIds.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiro() {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, 'fisica', $2, $3, 'ativo', $4)
     RETURNING id`,
    [`Parceiro Soft Delete ${randomUUID()}`, randomUUID(), `parceiro_${randomUUID()}@atvos.test`, testUserId]
  );
  parceiroIds.add(rows[0].id);
  return rows[0];
}

async function criarTerra() {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO terras (nome, area_contratada_ha, cidade, estado, status, criado_por)
     VALUES ($1, 150, 'Ribeirão Preto', 'SP', 'ativo', $2)
     RETURNING id`,
    [`Terra Soft Delete ${randomUUID()}`, testUserId]
  );
  terraIds.add(rows[0].id);
  return rows[0];
}

describe('soft delete de parceiro e terra', () => {
  it('marca parceiro como inativo, oculta da listagem e registra auditoria', async () => {
    const parceiro = await criarParceiro();

    const res = await request(app).delete(`/api/parceiros/${parceiro.id}`).send({
      atualizado_por: testUserId,
      comentario: 'Remoção operacional',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('inativo');

    const lista = await request(app).get('/api/parceiros');
    expect(lista.body.map((item: { id: string }) => item.id)).not.toContain(parceiro.id);

    const { rows } = await pool.query(
      `SELECT entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario
         FROM registro_alteracao
        WHERE entidade_id = $1
          AND tipo_operacao = 'exclusao'`,
      [parceiro.id]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entidade_afetada: 'parceiro',
      entidade_id: parceiro.id,
      tipo_operacao: 'exclusao',
      status: 'aprovado',
      comentario: 'Remoção operacional',
    });
    expect(rows[0].dados_anteriores.status).toBe('ativo');
    expect(rows[0].dados_novos.status).toBe('inativo');
  });

  it('marca terra como inativa, oculta da listagem e registra auditoria', async () => {
    const terra = await criarTerra();

    const res = await request(app).delete(`/api/terras/${terra.id}`).send({
      atualizado_por: testUserId,
      comentario: 'Terra removida da operação',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('inativo');

    const lista = await request(app).get('/api/terras');
    expect(lista.body.map((item: { id: string }) => item.id)).not.toContain(terra.id);

    const { rows } = await pool.query(
      `SELECT entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario
         FROM registro_alteracao
        WHERE entidade_id = $1
          AND tipo_operacao = 'exclusao'`,
      [terra.id]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entidade_afetada: 'terra',
      entidade_id: terra.id,
      tipo_operacao: 'exclusao',
      status: 'aprovado',
      comentario: 'Terra removida da operação',
    });
    expect(rows[0].dados_anteriores.status).toBe('ativo');
    expect(rows[0].dados_novos.status).toBe('inativo');
  });
});
