import { randomUUID } from 'crypto';
import { InteracaoService } from '../services/interacaoService';
import { InteracaoRepository } from '../repositories/interacaoRepository';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, ids } from './helpers/usuarios';

const service = new InteracaoService(new InteracaoRepository());
const EMAIL = 'itg.svc.interacao@atvos.test';

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
    await pool.query(`DELETE FROM interacao WHERE parceiro_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [ids]);
  }
  await pool.query(`DELETE FROM interacao WHERE registrado_por = $1`, [usuarioId]);
  await removerUsuarioPorEmail(EMAIL);
  parceirosCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarParceiroNoBanco() {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, 'fisica', $2, $3, 'rascunho'::status_validacao, $4)
     RETURNING id`,
    [`Parceiro ${randomUUID()}`, randomUUID(), `int_${randomUUID()}@atvos.test`, usuarioId]
  );
  parceirosCriados.add(rows[0].id);
  return rows[0];
}

describe('InteracaoService.registrarInteracao (unitário, banco real)', () => {
  // CT01 → RN11 (RF006): registro de interação para parceiro existente é persistido
  it('registra uma interação para um parceiro existente e persiste no banco', async () => {
    const parceiro = await criarParceiroNoBanco();

    const interacao = await service.registrarInteracao(parceiro.id, {
      registrado_por: usuarioId,
      tipo: 'ligacao',
      descricao: 'Contato inicial com o parceiro',
      data: '2026-06-09',
    });

    expect(interacao.id).toBeDefined();
    expect(interacao.parceiro_id).toBe(parceiro.id);
    expect(interacao.tipo).toBe('ligacao');

    const { rows } = await pool.query(
      'SELECT descricao, registrado_por FROM interacao WHERE id = $1',
      [interacao.id]
    );
    expect(rows[0].descricao).toBe('Contato inicial com o parceiro');
    expect(rows[0].registrado_por).toBe(usuarioId);
  });

  // CT02 → RN11 (RF006): registro para parceiro inexistente é bloqueado
  it('bloqueia o registro de interação para um parceiro inexistente', async () => {
    await expect(
      service.registrarInteracao(ids.inexistente, {
        registrado_por: usuarioId,
        tipo: 'ligacao',
        descricao: 'Não deveria persistir',
        data: '2026-06-09',
      })
    ).rejects.toThrow('Parceiro não localizado para registro');
  });
});
