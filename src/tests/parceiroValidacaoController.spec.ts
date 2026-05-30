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
    [testUserId, rows[0].id, 'Usuario Teste Validacao', `validacao_${testUserId}@atvos.test`]
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

async function criarParceiro(status = 'rascunho') {
  const { rows } = await pool.query<{ id: string; status: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, $2, $3, $4, $5::status_validacao, $6)
     RETURNING *`,
    [
      `Parceiro Validacao ${randomUUID()}`,
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

describe('PUT /api/parceiros/:id/validacao', () => {
  it('Caso 1 — parceiro em rascunho vai para pendente e registra auditoria', async () => {
    const parceiro = await criarParceiro('rascunho');

    const res = await request(app).put(`/api/parceiros/${parceiro.id}/validacao`).send({
      atualizado_por: testUserId,
      comentario: 'Enviar para coordenador',
    });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(parceiro.id);
    expect(res.body.status).toBe('pendente');
    expect(res.body.atualizado_por).toBe(testUserId);

    const { rows } = await pool.query(
      `SELECT tipo_operacao, status, comentario
         FROM registro_alteracao
        WHERE entidade_id = $1 AND tipo_operacao = 'envio'`,
      [parceiro.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        tipo_operacao: 'envio',
        status: 'pendente',
        comentario: 'Enviar para coordenador',
      })
    );
  });

  it('Caso 2 — parceiro devolvido também pode voltar para validação', async () => {
    const parceiro = await criarParceiro('devolvido');

    const res = await request(app).put(`/api/parceiros/${parceiro.id}/validacao`).send({
      atualizado_por: testUserId,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pendente');
  });

  it('Caso 3 — parceiro ativo ou já pendente não pode ser reenviado', async () => {
    const ativo = await criarParceiro('ativo');
    const pendente = await criarParceiro('pendente');

    const resAtivo = await request(app).put(`/api/parceiros/${ativo.id}/validacao`).send({
      atualizado_por: testUserId,
    });
    const resPendente = await request(app).put(`/api/parceiros/${pendente.id}/validacao`).send({
      atualizado_por: testUserId,
    });

    expect(resAtivo.status).toBe(409);
    expect(resAtivo.body.error).toMatch(/rascunho ou devolvido/);
    expect(resPendente.status).toBe(409);
    expect(resPendente.body.error).toMatch(/rascunho ou devolvido/);
  });

  it('Caso 4 — rejeita payload inválido, parceiro inexistente e usuário inexistente', async () => {
    const parceiro = await criarParceiro('rascunho');

    const semUsuario = await request(app).put(`/api/parceiros/${parceiro.id}/validacao`).send({});
    const parceiroInexistente = await request(app).put(`/api/parceiros/${UUID_INEXISTENTE}/validacao`).send({
      atualizado_por: testUserId,
    });
    const usuarioInexistente = await request(app).put(`/api/parceiros/${parceiro.id}/validacao`).send({
      atualizado_por: UUID_INEXISTENTE,
    });

    expect(semUsuario.status).toBe(400);
    expect(semUsuario.body.error).toMatch(/atualizado_por/);
    expect(parceiroInexistente.status).toBe(404);
    expect(parceiroInexistente.body.error).toBe('Parceiro não encontrado');
    expect(usuarioInexistente.status).toBe(422);
    expect(usuarioInexistente.body.error).toMatch(/atualizado_por/);
  });
});
