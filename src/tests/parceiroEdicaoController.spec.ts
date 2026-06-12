import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail } from './helpers/usuarios';

const EMAIL = 'itg.ctrl.edicao.parceiro@atvos.test';

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

describe('PATCH /api/parceiros/:id (integração com banco real)', () => {
  // CT53 → RN05 (RF005): edição parcial pelo endpoint atualiza e persiste os dados
  it('atualiza os dados do parceiro e persiste a alteração no banco', async () => {
    const criado = await request(app).post('/api/parceiros').send({
      nome: 'Parceiro Antes da Edição',
      tipo_pessoa: 'fisica',
      cpf_cnpj: randomUUID(),
      regiao: 'Ribeirão Preto - SP',
      criado_por: usuarioId,
    });
    expect(criado.status).toBe(201);
    parceirosCriados.add(criado.body.id);

    const res = await request(app).patch(`/api/parceiros/${criado.body.id}`).send({
      nome: 'Parceiro Depois da Edição',
      regiao: 'Sertãozinho - SP',
      atualizado_por: usuarioId,
    });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(criado.body.id);
    expect(res.body.nome).toBe('Parceiro Depois da Edição');
    expect(res.body.regiao).toBe('Sertãozinho - SP');

    const { rows } = await pool.query(
      'SELECT nome, regiao, atualizado_por FROM parceiros WHERE id = $1',
      [criado.body.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].nome).toBe('Parceiro Depois da Edição');
    expect(rows[0].regiao).toBe('Sertãozinho - SP');
    expect(rows[0].atualizado_por).toBe(usuarioId);
  });
});
