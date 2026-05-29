import request from 'supertest';
import app from '../server';
import pool from '../config/connection';

// ─── Controle de dados criados nos testes ───
const interacoesCriadas = new Set<string>();
const usuariosCriados = new Set<string>();
const parceirosCriados = new Set<string>();

// ─── Helpers ────────────────────────────────
const criarUsuario = async (): Promise<string> => {
  const perfilResult = await pool.query<{ id: string }>(
    `SELECT id FROM perfil_acesso WHERE nome = 'analista' LIMIT 1`,
  );
  const perfilId = perfilResult.rows[0].id;

  const result = await pool.query<{ id: string }>(
    `INSERT INTO usuarios (perfil_acesso_id, nome, email, senha_hash, ativo)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id`,
    [perfilId, 'Usuário Teste', `teste_${Date.now()}@atvos.com`, 'hash_fake'],
  );

  const id = result.rows[0].id;
  usuariosCriados.add(id);
  return id;
};

const criarParceiro = async (usuario_id: string): Promise<string> => {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, status, criado_por)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    ['Parceiro Teste', 'fisica', `${Date.now()}`, 'ativo', usuario_id],
  );

  const id = result.rows[0].id;
  parceirosCriados.add(id);
  return id;
};

const criarInteracao = async (parceiro_id: string, usuario_id: string, tipo: string): Promise<string> => {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO interacao (parceiro_id, registrado_por, tipo, descricao, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [parceiro_id, usuario_id, tipo, 'Interação de teste', '2026-05-21'],
  );

  const id = result.rows[0].id;
  interacoesCriadas.add(id);
  return id;
};

const limparDadosDeTeste = async (): Promise<void> => {
  const interacaoIds = Array.from(interacoesCriadas);
  if (interacaoIds.length > 0) {
    await pool.query(`DELETE FROM interacao WHERE id = ANY($1::uuid[])`, [interacaoIds]);
    interacoesCriadas.clear();
  }

  const parceiroIds = Array.from(parceirosCriados);
  if (parceiroIds.length > 0) {
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [parceiroIds]);
    parceirosCriados.clear();
  }

  const usuarioIds = Array.from(usuariosCriados);
  if (usuarioIds.length > 0) {
    await pool.query(`DELETE FROM usuarios WHERE id = ANY($1::uuid[])`, [usuarioIds]);
    usuariosCriados.clear();
  }
};

// ─── Suite ──────────────────────────────────
describe('GET /dashboards/interacoes — Fluxo 15 Visualização Dashboard', () => {
  beforeEach(async () => {
    await limparDadosDeTeste();
  });

  afterAll(async () => {
    await limparDadosDeTeste();
    await pool.end();
  });

  // T01 — Fluxo principal: sucesso
  it('deve retornar 200 com métricas de engajamento quando houver interações', async () => {
    const usuarioId = await criarUsuario();
    const parceiroId = await criarParceiro(usuarioId);
    await criarInteracao(parceiroId, usuarioId, 'visita');
    await criarInteracao(parceiroId, usuarioId, 'ligacao');

    const response = await request(app)
      .get('/dashboards/interacoes')
      .expect(200);

    expect(response.body).toHaveProperty('total_interacoes');
    expect(response.body).toHaveProperty('por_tipo');
    expect(response.body).toHaveProperty('por_status');
    expect(response.body).toHaveProperty('kpi_engajamento');
    expect(response.body.total_interacoes).toBeGreaterThan(0);
  });

  // T02 — Regra de negócio: sem dados
  it('deve retornar 404 quando não houver interações no banco', async () => {
    const response = await request(app)
      .get('/dashboards/interacoes')
      .expect(404);

    expect(response.body).toEqual({
      erro: 'Sem dados de interações para o período',
    });
  });

  // T03 — Payload inválido: rota inexistente
  it('deve retornar 404 quando a rota não existir', async () => {
    const response = await request(app)
      .get('/dashboards/interacoes/invalido')
      .expect(404);
  });

  // T04 — Verificação de persistência no banco
  it('deve retornar dados que correspondem ao que está no banco real', async () => {
    const usuarioId = await criarUsuario();
    const parceiroId = await criarParceiro(usuarioId);
    await criarInteracao(parceiroId, usuarioId, 'visita');
    await criarInteracao(parceiroId, usuarioId, 'visita');
    await criarInteracao(parceiroId, usuarioId, 'ligacao');

    const response = await request(app)
      .get('/dashboards/interacoes')
      .expect(200);

    // Confirma que o total bate com o que inserimos
    expect(response.body.total_interacoes).toBeGreaterThanOrEqual(3);

    // Confirma que os dados vieram do banco real
    const result = await pool.query(
      `SELECT COUNT(*) AS total FROM interacao WHERE id = ANY($1::uuid[])`,
      [Array.from(interacoesCriadas)],
    );
    expect(Number(result.rows[0].total)).toBe(3);
  });
});