import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { removerUsuarioPorEmail } from './helpers/usuarios';

// #476: papel do parceiro (fornecedor | proprietario | ambos).
// "ambos" permite que um único CPF represente os dois papéis em um só registro,
// sem relaxar a unicidade de cpf_cnpj.

let seedUserId: string;
let seedUserEmail: string;

beforeEach(async () => {
  seedUserId = randomUUID();
  seedUserEmail = `papel_${seedUserId}@atvos.test`;
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM perfil_acesso WHERE nome = 'analista'`
  );
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, $3, $4, true)`,
    [seedUserId, rows[0].id, 'Usuario Papel', seedUserEmail]
  );
});

afterEach(async () => {
  await removerUsuarioPorEmail(seedUserEmail);
});

afterAll(async () => {
  await pool.end();
});

function payloadBase(extra: Record<string, unknown> = {}) {
  return {
    nome: 'Parceiro Papel',
    tipo_pessoa: 'fisica',
    cpf_cnpj: randomUUID(),
    criado_por: seedUserId,
    ...extra,
  };
}

describe('POST /api/parceiros — papel do parceiro (#476)', () => {
  it('cadastra com papel "ambos" e persiste o papel', async () => {
    const res = await request(app).post('/api/parceiros').send(payloadBase({ papel: 'ambos' }));
    expect(res.status).toBe(201);
    expect(res.body.papel).toBe('ambos');

    const detalhe = await request(app).get(`/api/parceiros/${res.body.id}`);
    expect(detalhe.body.papel).toBe('ambos');
  });

  it('cadastra com papel "fornecedor"', async () => {
    const res = await request(app).post('/api/parceiros').send(payloadBase({ papel: 'fornecedor' }));
    expect(res.status).toBe(201);
    expect(res.body.papel).toBe('fornecedor');
  });

  it('rejeita papel inválido', async () => {
    const res = await request(app).post('/api/parceiros').send(payloadBase({ papel: 'xpto' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('papel deve ser "fornecedor", "proprietario" ou "ambos"');
  });

  it('cadastra normalmente sem papel (regressão — campo opcional)', async () => {
    const res = await request(app).post('/api/parceiros').send(payloadBase());
    expect(res.status).toBe(201);
    expect(res.body.papel == null).toBe(true);
  });
});
