import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

beforeEach(async () => {
  await pool.query('TRUNCATE parceiros RESTART IDENTITY CASCADE');
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo)
     VALUES ($1, $2, 'Admin', 'admin@test.com', true)
     ON CONFLICT (id) DO UPDATE
       SET perfil_acesso_id = EXCLUDED.perfil_acesso_id,
           nome = EXCLUDED.nome,
           email = EXCLUDED.email,
           ativo = EXCLUDED.ativo`,
    [SEED_USER_ID, rows[0].id]
  );
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/parceiros com campos complementares', () => {
  it('persiste campos exibidos no formulário agrícola', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send({
        nome: 'Fazenda Santa Clara',
        tipo_pessoa: 'juridica',
        cpf_cnpj: '12345678000199',
        criado_por: SEED_USER_ID,
        email: 'contato@santaclara.test',
        telefone: '(16) 99999-0000',
        regiao: 'Ribeirão Preto - SP',
        inscricao_estadual: '110042490114',
        usina_referencia: 'Usina Rio Claro',
        area_plantada: '500 hectares',
        tch_medio: '85 toneladas/hectare',
        atr_medio: '145 kg/tonelada',
        observacoes: 'Parceiro estratégico para safra atual',
      });

    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      `SELECT
          p.regiao,
          p.inscricao_estadual,
          p.usina_referencia,
          p.area_plantada,
          p.tch_medio,
          p.atr_medio,
          p.observacoes,
          tp.numero AS telefone
         FROM parceiros p
         LEFT JOIN telefone_parceiro tp ON tp.parceiro_id = p.id AND tp.principal = TRUE
        WHERE p.id = $1`,
      [res.body.id]
    );

    expect(rows[0]).toMatchObject({
      regiao: 'Ribeirão Preto - SP',
      inscricao_estadual: '110042490114',
      usina_referencia: 'Usina Rio Claro',
      area_plantada: '500 hectares',
      tch_medio: '85 toneladas/hectare',
      atr_medio: '145 kg/tonelada',
      observacoes: 'Parceiro estratégico para safra atual',
      telefone: '(16) 99999-0000',
    });
  });

  it('permite criar parceiro diretamente com status pendente para fluxo de validação', async () => {
    const res = await request(app)
      .post('/api/parceiros')
      .send({
        nome: 'Parceiro para Validação',
        tipo_pessoa: 'fisica',
        cpf_cnpj: '55555555555',
        criado_por: SEED_USER_ID,
        email: 'validacao@atvos.test',
        status: 'pendente',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pendente');
  });
});
