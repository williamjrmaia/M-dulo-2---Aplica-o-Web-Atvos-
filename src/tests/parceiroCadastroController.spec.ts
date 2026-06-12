import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail } from './helpers/usuarios';

const EMAIL = 'itg.ctrl.cadastro.parceiro@atvos.test';

let perfis: Record<string, string>;
let usuarioId: string;
const parceirosCriados = new Set<string>();

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista });
  usuarioId = u.id;
});

afterEach(async () => {
  const ids = Array.from(parceirosCriados);
  if (ids.length > 0) {
    await pool.query('DELETE FROM registro_alteracao WHERE entidade_id = ANY($1::uuid[])', [ids]);
    await pool.query('DELETE FROM telefone_parceiro WHERE parceiro_id = ANY($1::uuid[])', [ids]);
    await pool.query('DELETE FROM parceiros WHERE id = ANY($1::uuid[])', [ids]);
  }
  await removerUsuarioPorEmail(EMAIL);
  parceirosCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

async function contarParceirosDoUsuario(): Promise<number> {
  const { rows } = await pool.query<{ total: number }>(
    'SELECT COUNT(*)::int AS total FROM parceiros WHERE criado_por = $1',
    [usuarioId]
  );
  return rows[0].total;
}

describe('POST /api/parceiros — falhas de contrato (400)', () => {
  // CT61 → RN04 (RF004): payload sem campos obrigatórios é barrado antes de tocar o banco
  it('rejeita cadastro sem campos obrigatórios e não grava nada', async () => {
    const res = await request(app).post('/api/parceiros').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Campos obrigatórios: nome, tipo_pessoa, cpf_cnpj, criado_por');
    expect(await contarParceirosDoUsuario()).toBe(0);
  });

  it('rejeita tipo_pessoa fora do contrato e não grava nada', async () => {
    const res = await request(app).post('/api/parceiros').send({
      nome: 'Parceiro Tipo Errado',
      tipo_pessoa: 'estrangeira',
      cpf_cnpj: randomUUID(),
      criado_por: usuarioId,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('tipo_pessoa deve ser "fisica" ou "juridica"');
    expect(await contarParceirosDoUsuario()).toBe(0);
  });
});
