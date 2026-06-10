import request from 'supertest';
import app from '../server';
import pool from '../config/connection';
import { ExportaRepository } from '../repositories/exportaRepository';

// ─── Controle de dados criados nos testes ───
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
    [perfilId, 'Usuário Teste Exporta', `exporta_${Date.now()}@atvos.com`, 'hash_fake'],
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
    ['Parceiro Exporta Teste', 'fisica', `${Date.now()}`, 'ativo', usuario_id],
  );

  const id = result.rows[0].id;
  parceirosCriados.add(id);
  return id;
};

const limparDadosDeTeste = async (): Promise<void> => {
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
describe('GET /parceiros/exportar — Fluxo 16 Exportar Dados de Parceiros', () => {
  let usuarioId: string;

  beforeEach(async () => {
    await limparDadosDeTeste();
    usuarioId = await criarUsuario();
  });

  afterAll(async () => {
    await limparDadosDeTeste();
    await pool.end();
  });

  // T01 — Fluxo principal: sucesso com dados
  it('deve retornar 200 e o arquivo CSV quando houver parceiros cadastrados', async () => {
    await criarParceiro(usuarioId);

    const response = await request(app)
      .get('/parceiros/exportar')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toMatch(/dados_parceiros_ativos\.csv/);
    expect(response.text).toContain('id,nome,tipo_pessoa,cpf_cnpj,email,status,criado_em');
    expect(response.text).toContain('Parceiro Exporta Teste');
  });

  // T02 — Fluxo alternativo 1: nenhum parceiro ativo para exportar
  // A exportação lê todos os parceiros ativo do banco inteiro, então não dá
  // para garantir o cenário "vazio" apagando linhas em uma suíte que roda em
  // paralelo. Forçamos o repository a devolver lista vazia para testar de forma
  // determinística o caminho EmptyDataException → 404.
  it('deve retornar 404 quando não houver parceiros cadastrados', async () => {
    const spy = jest
      .spyOn(ExportaRepository.prototype, 'buscarTodosDadosParceiros')
      .mockResolvedValue([]);

    try {
      const response = await request(app)
        .get('/parceiros/exportar')
        .expect(404);

      expect(response.body).toEqual({
        erro: 'Nenhum dado disponível para exportar',
      });
    } finally {
      spy.mockRestore();
    }
  });

  // T03 — Verificação do conteúdo do CSV
  it('deve retornar CSV com os dados corretos do parceiro criado', async () => {
    await criarParceiro(usuarioId);

    const response = await request(app)
      .get('/parceiros/exportar')
      .expect(200);

    const linhas = response.text.split('\n');
    expect(linhas[0]).toBe('id,nome,tipo_pessoa,cpf_cnpj,email,status,criado_em');
    expect(linhas.length).toBeGreaterThan(1);
  });

  // T04 — Verificação de múltiplos parceiros no CSV
  it('deve exportar todos os parceiros cadastrados', async () => {
    await criarParceiro(usuarioId);
    await criarParceiro(usuarioId);
    await criarParceiro(usuarioId);

    const response = await request(app)
      .get('/parceiros/exportar')
      .expect(200);

    const linhas = response.text.split('\n').filter((l) => l.trim() !== '');
    // cabeçalho + 3 parceiros (pode haver mais no banco, então >= 4)
    expect(linhas.length).toBeGreaterThanOrEqual(4);
  });
});