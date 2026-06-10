import { randomUUID } from 'crypto';
import { obterPendentesValidacao } from '../services/parceiroService';
import pool from '../config/connection';

let testUserId: string;
const parceiroIds = new Set<string>();

beforeEach(async () => {
  testUserId = randomUUID();
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
  await pool.query(
    `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo)
     VALUES ($1, $2, $3, $4, true)`,
    [testUserId, rows[0].id, 'Usuario Fila Validacao', `fila_${testUserId}@atvos.test`]
  );
});

afterEach(async () => {
  const ids = Array.from(parceiroIds);
  if (ids.length > 0) {
    await pool.query(`DELETE FROM registro_alteracao WHERE entidade_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [ids]);
  }
  await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
  parceiroIds.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiro(status: string, nome: string) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, 'fisica', $2, $3, $4::status_validacao, $5)
     RETURNING id`,
    [nome, randomUUID(), `fila_${randomUUID()}@atvos.test`, status, testUserId]
  );
  parceiroIds.add(rows[0].id);
  return rows[0];
}

async function registrarEnvio(parceiroId: string, data: string) {
  await pool.query(
    `INSERT INTO registro_alteracao
       (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, data_alteracao)
     VALUES ($1, 'parceiro', $2, 'envio', '{}'::jsonb, '{}'::jsonb, 'pendente', $3)`,
    [testUserId, parceiroId, data]
  );
}

describe('obterPendentesValidacao', () => {
  it('busca somente pendentes e ordena por data de envio decrescente', async () => {
    const antigo = await criarParceiro('pendente', 'Pendente Antigo');
    const recente = await criarParceiro('pendente', 'Pendente Recente');
    await criarParceiro('rascunho', 'Rascunho Fora da Fila');
    await criarParceiro('ativo', 'Ativo Fora da Fila');

    await registrarEnvio(antigo.id, '2026-06-08T10:00:00Z');
    await registrarEnvio(recente.id, '2026-06-09T10:00:00Z');

    const pendentes = await obterPendentesValidacao();
    const ids = pendentes.map((parceiro) => parceiro.id);

    expect(ids.indexOf(recente.id)).toBeLessThan(ids.indexOf(antigo.id));
    expect(ids).toContain(recente.id);
    expect(ids).toContain(antigo.id);
    expect(pendentes.map((parceiro) => parceiro.nome)).not.toContain('Rascunho Fora da Fila');
    expect(pendentes.map((parceiro) => parceiro.nome)).not.toContain('Ativo Fora da Fila');
    expect(pendentes.find((parceiro) => parceiro.id === recente.id)?.data_envio).toBeDefined();
  });
});
