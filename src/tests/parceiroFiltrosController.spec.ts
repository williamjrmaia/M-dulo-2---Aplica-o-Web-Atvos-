import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

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
    [testUserId, rows[0].id, 'Usuario Teste Filtros', `filtros_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  const parceiroIds = Array.from(parceirosCriados);
  const terraIds = Array.from(terrasCriadas);

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

async function criarParceiro(params: {
  nome: string;
  status?: string;
  tipoPessoa?: 'fisica' | 'juridica';
}) {
  const { rows } = await pool.query<{ id: string; nome: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, $2, $3, $4, $5::status_validacao, $6)
     RETURNING *`,
    [
      params.nome,
      params.tipoPessoa ?? 'fisica',
      randomUUID(),
      `parceiro_${randomUUID()}@atvos.test`,
      params.status ?? 'ativo',
      testUserId,
    ]
  );

  parceirosCriados.add(rows[0].id);
  return rows[0];
}

async function criarTerra(params: { cidade: string; estado: string; area: number; status?: string }) {
  const { rows } = await pool.query<{ id: string; nome: string }>(
    `INSERT INTO terras (nome, area_contratada_ha, cidade, estado, status, criado_por)
     VALUES ($1, $2, $3, $4, $5::status_validacao, $6)
     RETURNING *`,
    [`Terra ${randomUUID()}`, params.area, params.cidade, params.estado, params.status ?? 'ativo', testUserId]
  );

  terrasCriadas.add(rows[0].id);
  return rows[0];
}

async function vincularParceiroTerra(parceiroId: string, terraId: string) {
  await pool.query(
    `INSERT INTO parceiro_terra (parceiro_id, terra_id, tipo_vinculo)
     VALUES ($1, $2, $3)`,
    [parceiroId, terraId, 'teste']
  );
}

async function criarVinculoComercial(parceiroId: string, terraId: string, tipoParceiro: string) {
  await pool.query(
    `INSERT INTO vinculo_comercial (parceiro_id, terra_id, tipo_parceiro, tipo_vinculo, status)
     VALUES ($1, $2, $3, $4, 'ativo')`,
    [parceiroId, terraId, tipoParceiro, 'contrato teste']
  );
}

describe('GET /api/parceiros com filtros', () => {
  it('Caso 1 — sem filtros retorna parceiros não inativos e oculta inativos', async () => {
    const ativo = await criarParceiro({ nome: `Filtro Ativo ${randomUUID()}` });
    const inativo = await criarParceiro({ nome: `Filtro Inativo ${randomUUID()}`, status: 'inativo' });

    const res = await request(app).get('/api/parceiros');

    expect(res.status).toBe(200);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).toContain(ativo.id);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).not.toContain(inativo.id);
  });

  it('Caso 2 — filtra por nome parcial sem diferenciar maiúsculas', async () => {
    const alvo = await criarParceiro({ nome: `Parceiro Alvo ${randomUUID()}` });
    const outro = await criarParceiro({ nome: `Parceiro Outro ${randomUUID()}` });

    const res = await request(app).get('/api/parceiros').query({ nome: 'alvo' });

    expect(res.status).toBe(200);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).toContain(alvo.id);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).not.toContain(outro.id);
  });

  it('Caso 3 — combina região e área mínima via terras vinculadas', async () => {
    const parceiroCompativel = await criarParceiro({ nome: `Parceiro Região Área ${randomUUID()}` });
    const parceiroOutraRegiao = await criarParceiro({ nome: `Parceiro Outra Região ${randomUUID()}` });
    const parceiroAreaMenor = await criarParceiro({ nome: `Parceiro Área Menor ${randomUUID()}` });
    const terraCompativel = await criarTerra({ cidade: 'Ribeirão Preto', estado: 'SP', area: 150 });
    const terraOutraRegiao = await criarTerra({ cidade: 'Goiânia', estado: 'GO', area: 300 });
    const terraAreaMenor = await criarTerra({ cidade: 'Sertãozinho', estado: 'SP', area: 50 });

    await vincularParceiroTerra(parceiroCompativel.id, terraCompativel.id);
    await vincularParceiroTerra(parceiroOutraRegiao.id, terraOutraRegiao.id);
    await vincularParceiroTerra(parceiroAreaMenor.id, terraAreaMenor.id);

    const res = await request(app).get('/api/parceiros').query({ regiao: 'SP', area: 100 });

    expect(res.status).toBe(200);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).toContain(parceiroCompativel.id);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).not.toContain(parceiroOutraRegiao.id);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).not.toContain(parceiroAreaMenor.id);
  });

  it('Caso 4 — filtra por tipo de parceiro comercial', async () => {
    const fornecedor = await criarParceiro({ nome: `Parceiro Fornecedor ${randomUUID()}` });
    const arrendador = await criarParceiro({ nome: `Parceiro Arrendador ${randomUUID()}` });
    const terraFornecedor = await criarTerra({ cidade: 'Ribeirão Preto', estado: 'SP', area: 120 });
    const terraArrendador = await criarTerra({ cidade: 'Ribeirão Preto', estado: 'SP', area: 120 });

    await criarVinculoComercial(fornecedor.id, terraFornecedor.id, 'fornecedor');
    await criarVinculoComercial(arrendador.id, terraArrendador.id, 'arrendador');

    const res = await request(app).get('/api/parceiros').query({ tipo: 'fornecedor' });

    expect(res.status).toBe(200);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).toContain(fornecedor.id);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).not.toContain(arrendador.id);
  });

  // CT62 → RN04 (RF007): filtro com valor fora do contrato é barrado pelo schema com 400
  it('Caso 5 — status fora do contrato retorna 400 com mensagem do schema', async () => {
    const res = await request(app).get('/api/parceiros').query({ status: 'arquivado' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('status: status deve ser rascunho, pendente, ativo, devolvido ou inativo');
  });
});
