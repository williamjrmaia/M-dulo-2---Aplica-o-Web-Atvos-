import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

let analistaId: string;
let outroAnalistaId: string;
const parceiroIds = new Set<string>();

beforeEach(async () => {
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  analistaId = randomUUID();
  outroAnalistaId = randomUUID();

  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo)
     VALUES ($1, $3, 'Analista Rascunhos', $2, true),
            ($4, $3, 'Outro Analista', $5, true)`,
    [
      analistaId,
      `analista_${analistaId}@atvos.test`,
      rows[0].id,
      outroAnalistaId,
      `outro_${outroAnalistaId}@atvos.test`,
    ]
  );
});

afterEach(async () => {
  const ids = Array.from(parceiroIds);
  if (ids.length > 0) {
    await pool.query(`DELETE FROM registro_alteracao WHERE entidade_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [ids]);
  }
  await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [[analistaId, outroAnalistaId]]);
  parceiroIds.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiro(params: { status: string; criadoPor: string; nome: string }) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, 'fisica', $2, $3, $4::status_validacao, $5)
     RETURNING id`,
    [
      params.nome,
      randomUUID(),
      `parceiro_${randomUUID()}@atvos.test`,
      params.status,
      params.criadoPor,
    ]
  );
  parceiroIds.add(rows[0].id);
  return rows[0];
}

async function registrarDevolucao(parceiroId: string, comentario: string, data: string) {
  await pool.query(
    `INSERT INTO registro_alteracao
       (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario, data_alteracao)
     VALUES ($1, 'parceiro', $2, 'devolucao', '{}'::jsonb, '{}'::jsonb, 'devolvido', $3, $4)`,
    [analistaId, parceiroId, comentario, data]
  );
}

describe('GET /api/parceiros/rascunhos-devolvidos', () => {
  it('lista rascunhos e devolvidos do analista com comentário mais recente de devolução', async () => {
    const rascunho = await criarParceiro({
      status: 'rascunho',
      criadoPor: analistaId,
      nome: 'Parceiro Rascunho',
    });
    const devolvido = await criarParceiro({
      status: 'devolvido',
      criadoPor: analistaId,
      nome: 'Parceiro Devolvido',
    });
    await criarParceiro({ status: 'ativo', criadoPor: analistaId, nome: 'Parceiro Ativo' });
    await criarParceiro({ status: 'devolvido', criadoPor: outroAnalistaId, nome: 'Parceiro de Outro Analista' });

    await registrarDevolucao(devolvido.id, 'Comentário antigo', '2026-06-08T10:00:00Z');
    await registrarDevolucao(devolvido.id, 'Comentário mais recente', '2026-06-09T10:00:00Z');

    const res = await request(app)
      .get('/api/parceiros/rascunhos-devolvidos')
      .query({ analista_id: analistaId });

    expect(res.status).toBe(200);
    expect(res.body.map((parceiro: { id: string }) => parceiro.id)).toEqual(
      expect.arrayContaining([rascunho.id, devolvido.id])
    );
    expect(res.body.map((parceiro: { nome: string }) => parceiro.nome)).not.toContain('Parceiro Ativo');
    expect(res.body.map((parceiro: { nome: string }) => parceiro.nome)).not.toContain('Parceiro de Outro Analista');

    const devolvidoRetornado = res.body.find((parceiro: { id: string }) => parceiro.id === devolvido.id);
    expect(devolvidoRetornado.comentario_devolucao).toBe('Comentário mais recente');
  });

  it('retorna 400 quando o analista não está identificado', async () => {
    const res = await request(app).get('/api/parceiros/rascunhos-devolvidos');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Analista logado não identificado');
  });
});
