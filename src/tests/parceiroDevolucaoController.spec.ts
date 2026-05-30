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
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('coordenador', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM perfil_acesso WHERE nome = 'coordenador'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, $3, $4, true)`,
    [testUserId, rows[0].id, 'Usuario Teste Devolucao', `devolucao_${testUserId}@atvos.test`]
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

async function criarParceiro(status = 'pendente') {
  const { rows } = await pool.query<{ id: string; status: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, $2, $3, $4, $5::status_validacao, $6)
     RETURNING *`,
    [
      `Parceiro Devolucao ${randomUUID()}`,
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

async function criarRegistroEnvioPendente(parceiroId: string) {
  await pool.query(
    `INSERT INTO registro_alteracao
       (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status)
     VALUES ($1, 'parceiro', $2, 'envio', $3::jsonb, $4::jsonb, 'pendente')`,
    [
      testUserId,
      parceiroId,
      JSON.stringify({ status: 'rascunho' }),
      JSON.stringify({ status: 'pendente' }),
    ]
  );
}

describe('PUT /api/parceiros/:id/devolver', () => {
  it('Caso 1 — parceiro pendente vira devolvido e registra devolução', async () => {
    const parceiro = await criarParceiro('pendente');
    await criarRegistroEnvioPendente(parceiro.id);

    const res = await request(app).put(`/api/parceiros/${parceiro.id}/devolver`).send({
      devolvido_por: testUserId,
      comentario: 'Faltam dados cadastrais',
    });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(parceiro.id);
    expect(res.body.status).toBe('devolvido');
    expect(res.body.atualizado_por).toBe(testUserId);

    const { rows } = await pool.query(
      `SELECT tipo_operacao, status, comentario
         FROM registro_alteracao
        WHERE entidade_id = $1
        ORDER BY data_alteracao ASC`,
      [parceiro.id]
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo_operacao: 'envio',
          status: 'devolvido',
        }),
        expect.objectContaining({
          tipo_operacao: 'devolucao',
          status: 'devolvido',
          comentario: 'Faltam dados cadastrais',
        }),
      ])
    );
  });

  it('Caso 2 — parceiro pendente sem registro prévio também pode ser devolvido', async () => {
    const parceiro = await criarParceiro('pendente');

    const res = await request(app).put(`/api/parceiros/${parceiro.id}/devolver`).send({
      devolvido_por: testUserId,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('devolvido');
  });

  it('Caso 3 — parceiro rascunho, devolvido ou ativo não pode ser devolvido', async () => {
    const rascunho = await criarParceiro('rascunho');
    const devolvido = await criarParceiro('devolvido');
    const ativo = await criarParceiro('ativo');

    const resRascunho = await request(app).put(`/api/parceiros/${rascunho.id}/devolver`).send({
      devolvido_por: testUserId,
    });
    const resDevolvido = await request(app).put(`/api/parceiros/${devolvido.id}/devolver`).send({
      devolvido_por: testUserId,
    });
    const resAtivo = await request(app).put(`/api/parceiros/${ativo.id}/devolver`).send({
      devolvido_por: testUserId,
    });

    expect(resRascunho.status).toBe(409);
    expect(resDevolvido.status).toBe(409);
    expect(resAtivo.status).toBe(409);
  });

  it('Caso 4 — rejeita payload inválido, parceiro inexistente e usuário inexistente', async () => {
    const parceiro = await criarParceiro('pendente');

    const semUsuario = await request(app).put(`/api/parceiros/${parceiro.id}/devolver`).send({});
    const parceiroInexistente = await request(app).put(`/api/parceiros/${UUID_INEXISTENTE}/devolver`).send({
      devolvido_por: testUserId,
    });
    const usuarioInexistente = await request(app).put(`/api/parceiros/${parceiro.id}/devolver`).send({
      devolvido_por: UUID_INEXISTENTE,
    });

    expect(semUsuario.status).toBe(400);
    expect(semUsuario.body.error).toMatch(/devolvido_por/);
    expect(parceiroInexistente.status).toBe(404);
    expect(parceiroInexistente.body.error).toBe('Parceiro não encontrado');
    expect(usuarioInexistente.status).toBe(422);
    expect(usuarioInexistente.body.error).toMatch(/devolvido_por/);
  });
});
