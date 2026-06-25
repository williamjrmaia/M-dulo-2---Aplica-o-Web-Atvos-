import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { removerUsuarioPorEmail } from './helpers/usuarios';

// #477: campos com restrição de formato no cadastro de parceiro.
// - nome_acompanhante: apenas letras
// - telefone: apenas números (e máscara: parênteses, +, hífen, espaço)

let seedUserId: string;
let seedUserEmail: string;

beforeEach(async () => {
  seedUserId = randomUUID();
  seedUserEmail = `formato_${seedUserId}@atvos.test`;
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM perfil_acesso WHERE nome = 'analista'`
  );
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, $3, $4, true)`,
    [seedUserId, rows[0].id, 'Usuario Formato', seedUserEmail]
  );
});

afterEach(async () => {
  // Helper auto-saneador: limpa toda a cadeia (parceiros, telefone, registro_alteracao) e o usuário.
  await removerUsuarioPorEmail(seedUserEmail);
});

afterAll(async () => {
  await pool.end();
});

function payloadBase(extra: Record<string, unknown> = {}) {
  return {
    nome: 'Parceiro Formato',
    tipo_pessoa: 'fisica',
    cpf_cnpj: randomUUID(),
    criado_por: seedUserId,
    ...extra,
  };
}

describe('POST /api/parceiros — formato de campos (#477)', () => {
  it('rejeita nome_acompanhante com números (apenas letras)', async () => {
    const res = await request(app).post('/api/parceiros').send(payloadBase({ nome_acompanhante: 'Joao 123' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Nome do acompanhante deve conter apenas letras');
  });

  it('rejeita telefone com letras (apenas números)', async () => {
    const res = await request(app).post('/api/parceiros').send(payloadBase({ telefone: 'abc123' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Telefone deve conter apenas números');
  });

  it('aceita nome_acompanhante só com letras e telefone com máscara numérica', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send(payloadBase({ nome_acompanhante: 'Maria da Silva', telefone: '(16) 99999-0000' }));

    expect(res.status).toBe(201);
  });

  it('não barra cadastro sem os campos opcionais (regressão)', async () => {
    const res = await request(app).post('/api/parceiros').send(payloadBase());

    expect(res.status).toBe(201);
  });
});
