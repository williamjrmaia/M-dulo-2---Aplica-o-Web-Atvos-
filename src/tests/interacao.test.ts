import request from 'supertest';
import app from '../server';
import pool from '../config/connection';

// ─── Controle de dados criados nos testes ───
const interacoesCriadas = new Set<string>();
const usuariosCriados = new Set<string>();
const parceirosCriados = new Set<string>();

let parceiroId: string;
let usuarioId: string;

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
describe('POST /parceiros/:id/interacoes — Fluxo 11 Registrar Interação', () => {
  beforeEach(async () => {
    await limparDadosDeTeste();
    usuarioId = await criarUsuario();
    parceiroId = await criarParceiro(usuarioId);
  });

  afterAll(async () => {
    await limparDadosDeTeste();
    await pool.end();
  });

  // T01 — Fluxo principal: sucesso
  it('deve retornar 201 e a interação criada com dados válidos', async () => {
    const response = await request(app)
      .post(`/parceiros/${parceiroId}/interacoes`)
      .send({
        registrado_por: usuarioId,
        tipo: 'visita',
        descricao: 'Visita realizada ao parceiro',
        data: '2026-05-21',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.parceiro_id).toBe(parceiroId);
    expect(response.body.tipo).toBe('visita');

    interacoesCriadas.add(response.body.id);
  });

  // T02 — Payload inválido
  it('deve retornar 400 quando campos obrigatórios estiverem ausentes', async () => {
    const response = await request(app)
      .post(`/parceiros/${parceiroId}/interacoes`)
      .send({ tipo: 'visita' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Dados de interação inválidos',
    });
  });

  // T03 — Regra de negócio: parceiro não encontrado
  it('deve retornar 404 quando o parceiro não existir', async () => {
    const idInexistente = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .post(`/parceiros/${idInexistente}/interacoes`)
      .send({
        registrado_por: usuarioId,
        tipo: 'visita',
        descricao: 'Visita realizada ao parceiro',
        data: '2026-05-21',
      })
      .expect(404);

    expect(response.body).toEqual({
      error: 'Parceiro não localizado para registro',
    });
  });

  // T04 — Verificação de persistência no banco
  it('deve persistir a interação no banco após criação', async () => {
    const response = await request(app)
      .post(`/parceiros/${parceiroId}/interacoes`)
      .send({
        registrado_por: usuarioId,
        tipo: 'ligacao',
        descricao: 'Ligação de acompanhamento',
        data: '2026-05-21',
      })
      .expect(201);

    interacoesCriadas.add(response.body.id);

    const result = await pool.query(
      `SELECT * FROM interacao WHERE id = $1`,
      [response.body.id],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].parceiro_id).toBe(parceiroId);
    expect(result.rows[0].tipo).toBe('ligacao');
    expect(result.rows[0].descricao).toBe('Ligação de acompanhamento');
  });
});