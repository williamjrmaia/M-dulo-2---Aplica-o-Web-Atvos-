import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

const UUID_INEXISTENTE = '00000000-0000-0000-0000-0000000000ff';
let testUserId: string;

const parceirosCriados = new Set<string>();
const terrasCriadas = new Set<string>();

beforeEach(async () => {
  testUserId = randomUUID();
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, $3, $4, true)`,
    [testUserId, rows[0].id, 'Usuario Teste Vinculos', `vinculos_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  const parceiroIds = Array.from(parceirosCriados);
  const terraIds = Array.from(terrasCriadas);

  await pool.query(`DELETE FROM registro_alteracao WHERE usuario_id = $1 OR aprovado_por = $1`, [testUserId]);

  if (parceiroIds.length > 0 || terraIds.length > 0) {
    await pool.query(
      `DELETE FROM vinculo_comercial
        WHERE parceiro_id = ANY($1::uuid[])
           OR terra_id = ANY($2::uuid[])`,
      [parceiroIds, terraIds]
    );
    await pool.query(
      `DELETE FROM parceiro_terra
        WHERE parceiro_id = ANY($1::uuid[])
           OR terra_id = ANY($2::uuid[])`,
      [parceiroIds, terraIds]
    );
  }

  if (terraIds.length > 0) {
    await pool.query(`DELETE FROM terras WHERE id = ANY($1::uuid[])`, [terraIds]);
  }

  if (parceiroIds.length > 0) {
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [parceiroIds]);
  }

  await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
  parceirosCriados.clear();
  terrasCriadas.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiro(status = 'ativo') {
  const { rows } = await pool.query<{ id: string; nome: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, $2, $3, $4, $5::status_validacao, $6)
     RETURNING *`,
    [
      `Parceiro ${randomUUID()}`,
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

async function criarTerra(status = 'ativo') {
  const { rows } = await pool.query<{ id: string; nome: string }>(
    `INSERT INTO terras (nome, area_contratada_ha, cidade, estado, status, criado_por)
     VALUES ($1, $2, $3, $4, $5::status_validacao, $6)
     RETURNING *`,
    [`Terra ${randomUUID()}`, 120.5, 'Ribeirão Preto', 'SP', status, testUserId]
  );

  terrasCriadas.add(rows[0].id);
  return rows[0];
}

describe('POST /api/parceiros/:id/terras', () => {
  it('Caso 1 — vincula uma terra existente ao parceiro → 201', async () => {
    const parceiro = await criarParceiro();
    const terra = await criarTerra();

    const res = await request(app).post(`/api/parceiros/${parceiro.id}/terras`).send({
      terra_id: terra.id,
      tipo_vinculo: 'arrendamento',
    });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/parceiros/${parceiro.id}/terras/${terra.id}`);
    expect(res.body.parceiro_id).toBe(parceiro.id);
    expect(res.body.terra_id).toBe(terra.id);
    expect(res.body.tipo_vinculo).toBe('arrendamento');

    const { rows } = await pool.query(
      `SELECT usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario
         FROM registro_alteracao
        WHERE entidade_id = $1
          AND tipo_operacao = 'criacao'`,
      [res.body.id]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      usuario_id: testUserId,
      entidade_afetada: 'parceiro_terra',
      entidade_id: res.body.id,
      tipo_operacao: 'criacao',
      dados_anteriores: null,
      status: 'aprovado',
      comentario: 'Vínculo parceiro-terra criado',
    });
    expect(rows[0].dados_novos).toMatchObject({
      id: res.body.id,
      parceiro_id: parceiro.id,
      terra_id: terra.id,
      tipo_vinculo: 'arrendamento',
    });
  });

  it('Caso 2 — payload sem terra_id → 400', async () => {
    const parceiro = await criarParceiro();

    const res = await request(app).post(`/api/parceiros/${parceiro.id}/terras`).send({
      tipo_vinculo: 'arrendamento',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/terra_id/);
  });

  it('Caso 3 — parceiro inexistente → 404', async () => {
    const terra = await criarTerra();

    const res = await request(app).post(`/api/parceiros/${UUID_INEXISTENTE}/terras`).send({
      terra_id: terra.id,
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Parceiro não encontrado');
  });

  it('Caso 4 — terra inexistente → 422', async () => {
    const parceiro = await criarParceiro();

    const res = await request(app).post(`/api/parceiros/${parceiro.id}/terras`).send({
      terra_id: UUID_INEXISTENTE,
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/terra_id/);
  });

  it('Caso 5 — vínculo duplicado → 409', async () => {
    const parceiro = await criarParceiro();
    const terra = await criarTerra();

    await request(app).post(`/api/parceiros/${parceiro.id}/terras`).send({ terra_id: terra.id });
    const res = await request(app).post(`/api/parceiros/${parceiro.id}/terras`).send({ terra_id: terra.id });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/já vinculada/);
  });

  it('Caso 6 — persistência: SELECT confirma o vínculo salvo', async () => {
    const parceiro = await criarParceiro();
    const terra = await criarTerra();

    const res = await request(app).post(`/api/parceiros/${parceiro.id}/terras`).send({
      terra_id: terra.id,
      tipo_vinculo: 'coproprietario',
    });

    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      `SELECT parceiro_id, terra_id, tipo_vinculo
         FROM parceiro_terra
        WHERE parceiro_id = $1 AND terra_id = $2`,
      [parceiro.id, terra.id]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].tipo_vinculo).toBe('coproprietario');
  });

  it('Caso 7 — persiste dados comerciais expandidos quando informados', async () => {
    const parceiro = await criarParceiro();
    const terra = await criarTerra();

    const res = await request(app).post(`/api/parceiros/${parceiro.id}/terras`).send({
      terra_id: terra.id,
      tipo_vinculo: 'contrato de fornecimento',
      tipo_parceiro: 'fornecedor',
      modalidade_contrato: 'Fornecimento de cana',
      data_inicio: '2026-06-01',
      data_fim: '2027-05-31',
      observacoes: 'Contrato previsto para a safra atual',
    });

    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      `SELECT tipo_parceiro, tipo_vinculo, modalidade_contrato, data_inicio, data_fim, observacoes
         FROM vinculo_comercial
        WHERE parceiro_id = $1 AND terra_id = $2`,
      [parceiro.id, terra.id]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        tipo_parceiro: 'fornecedor',
        tipo_vinculo: 'contrato de fornecimento',
        modalidade_contrato: 'Fornecimento de cana',
        observacoes: 'Contrato previsto para a safra atual',
      })
    );
    expect(rows[0].data_inicio.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(rows[0].data_fim.toISOString().slice(0, 10)).toBe('2027-05-31');
  });
});

describe('GET /api/parceiros/:id/terras', () => {
  it('Caso 1 — lista terras vinculadas ao parceiro → 200', async () => {
    const parceiro = await criarParceiro();
    const terra = await criarTerra();
    await request(app).post(`/api/parceiros/${parceiro.id}/terras`).send({
      terra_id: terra.id,
      tipo_vinculo: 'meeiro',
    });

    const res = await request(app).get(`/api/parceiros/${parceiro.id}/terras`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: terra.id,
          nome: terra.nome,
          tipo_vinculo: 'meeiro',
        }),
      ])
    );
    expect(Number(res.body.find((item: { id: string }) => item.id === terra.id).area_contratada_ha)).toBe(120.5);
  });

  it('Caso 2 — parceiro inexistente → 404', async () => {
    const res = await request(app).get(`/api/parceiros/${UUID_INEXISTENTE}/terras`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Parceiro não encontrado');
  });

  it('Caso 3 — não lista terras inativas vinculadas ao parceiro', async () => {
    const parceiro = await criarParceiro();
    const terraAtiva = await criarTerra('ativo');
    const terraInativa = await criarTerra('inativo');

    await pool.query(
      `INSERT INTO parceiro_terra (parceiro_id, terra_id, tipo_vinculo)
       VALUES ($1, $2, $3), ($1, $4, $5)`,
      [parceiro.id, terraAtiva.id, 'ativo', terraInativa.id, 'inativo']
    );

    const res = await request(app).get(`/api/parceiros/${parceiro.id}/terras`);

    expect(res.status).toBe(200);
    expect(res.body.map((terra: { id: string }) => terra.id)).toContain(terraAtiva.id);
    expect(res.body.map((terra: { id: string }) => terra.id)).not.toContain(terraInativa.id);
  });

  it('Caso 4 — parceiro existente sem vínculos → 200 com array vazio', async () => {
    const parceiro = await criarParceiro();

    const res = await request(app).get(`/api/parceiros/${parceiro.id}/terras`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
