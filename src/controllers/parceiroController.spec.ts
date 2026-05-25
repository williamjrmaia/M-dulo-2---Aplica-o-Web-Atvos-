import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

beforeEach(async () => {
  await pool.query('TRUNCATE parceiros RESTART IDENTITY CASCADE');
  await pool.query('DELETE FROM usuarios WHERE id = $1', [SEED_USER_ID]);
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, 'Admin', 'admin@test.com', true)`,
    [SEED_USER_ID, rows[0].id]
  );
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/parceiros', () => {
  it('deve cadastrar parceiro com campos mínimos válidos, retornando status 201 e status rascunho (RN11)', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send({
        nome: 'João da Silva',
        tipo_pessoa: 'fisica',
        cpf_cnpj: '12345678901',
        criado_por: SEED_USER_ID,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      nome: 'João da Silva',
      tipo_pessoa: 'fisica',
      cpf_cnpj: '12345678901',
      status: 'rascunho',
    });
    expect(res.body.criado_por).toBe(SEED_USER_ID);
    expect(res.body.criado_em).toBeDefined();
    expect(res.body.id).toBeDefined();
  });

  // Caso 2: violação de domínio — entrada bem-formada que quebra RN09 (unicidade de cpf_cnpj)
  it('deve rejeitar cadastro de parceiro com CPF/CNPJ já existente, garantindo unicidade no banco (RN09)', async () => {
    await request(app)
      .post('/api/parceiros')
      .send({ nome: 'João', tipo_pessoa: 'fisica', cpf_cnpj: '11111111111', criado_por: SEED_USER_ID });

    const res = await request(app)
      .post('/api/parceiros')
      .send({ nome: 'Maria', tipo_pessoa: 'fisica', cpf_cnpj: '11111111111', criado_por: SEED_USER_ID });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cpf_cnpj/i);
  });

  // Caso 3: falha de contrato — entrada mal-formada (tipo_pessoa fora do ENUM), rejeitada antes do Service
  it('deve rejeitar payload com tipo_pessoa fora do ENUM, retornando 400 (RN10)', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send({
        nome: 'João da Silva',
        tipo_pessoa: 'empresa',
        cpf_cnpj: '99999999999',
        criado_por: SEED_USER_ID,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tipo_pessoa/i);
  });

  it('deve persistir o parceiro no banco com status rascunho e criado_por correto (RN11)', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send({
        nome: 'Teste Persistência',
        tipo_pessoa: 'juridica',
        cpf_cnpj: '00000000000191',
        criado_por: SEED_USER_ID,
      });

    expect(res.status).toBe(201);

    const { rows } = await pool.query('SELECT * FROM parceiros WHERE id = $1', [res.body.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('rascunho');
    expect(rows[0].criado_por).toBe(SEED_USER_ID);
    expect(rows[0].cpf_cnpj).toBe('00000000000191');
  });
});
