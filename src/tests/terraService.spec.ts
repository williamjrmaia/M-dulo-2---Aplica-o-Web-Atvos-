import { randomUUID } from 'crypto';
import {
  cadastrarTerra,
  obterTerras,
  editarTerra,
  obterParceirosDaTerra,
  vincularParceiroATerra,
} from '../services/terraService';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, ids } from './helpers/usuarios';

const EMAIL = 'itg.svc.terra@atvos.test';
let perfis: Record<string, string>;
let usuarioId: string;
const terrasCriadas = new Set<string>();
const parceirosCriados = new Set<string>();

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista });
  usuarioId = u.id;
});

afterEach(async () => {
  const terraIds = Array.from(terrasCriadas);
  const parceiroIds = Array.from(parceirosCriados);

  if (terraIds.length > 0 || parceiroIds.length > 0) {
    await pool.query(
      `DELETE FROM parceiro_terra WHERE terra_id = ANY($1::uuid[]) OR parceiro_id = ANY($2::uuid[])`,
      [terraIds, parceiroIds]
    );
  }
  if (terraIds.length > 0) {
    await pool.query(`DELETE FROM terras WHERE id = ANY($1::uuid[])`, [terraIds]);
  }
  if (parceiroIds.length > 0) {
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [parceiroIds]);
  }
  await removerUsuarioPorEmail(EMAIL);
  terrasCriadas.clear();
  parceirosCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

async function criarTerraNoBanco() {
  const { rows } = await pool.query<{ id: string; status: string }>(
    `INSERT INTO terras (nome, area_contratada_ha, cidade, estado, status, criado_por)
     VALUES ($1, $2, $3, $4, 'rascunho'::status_validacao, $5)
     RETURNING id, status`,
    [`Terra ${randomUUID()}`, 120.5, 'Ribeirão Preto', 'SP', usuarioId]
  );
  terrasCriadas.add(rows[0].id);
  return rows[0];
}

async function criarParceiroNoBanco() {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, 'fisica', $2, $3, 'rascunho'::status_validacao, $4)
     RETURNING id`,
    [`Parceiro ${randomUUID()}`, randomUUID(), `pt_${randomUUID()}@atvos.test`, usuarioId]
  );
  parceirosCriados.add(rows[0].id);
  return rows[0];
}

describe('terraService (unitário, banco real) — caminhos de sucesso', () => {
  // CT01 → RN10 (RF004): cadastro de terra em rascunho
  it('cadastra uma terra nova e persiste no banco com status rascunho', async () => {
    const terra = await cadastrarTerra({
      nome: 'Fazenda Boa Vista',
      area_contratada_ha: 250,
      cidade: 'Sertãozinho',
      estado: 'SP',
      criado_por: usuarioId,
    });
    terrasCriadas.add(terra.id);

    expect(terra.id).toBeDefined();
    expect(terra.nome).toBe('Fazenda Boa Vista');
    expect(terra.status).toBe('rascunho');

    const { rows } = await pool.query('SELECT nome, status FROM terras WHERE id = $1', [terra.id]);
    expect(rows[0].nome).toBe('Fazenda Boa Vista');
    expect(rows[0].status).toBe('rascunho');
  });

  // CT02 → RN10 (RF005): edição de terra
  it('edita uma terra existente e persiste a alteração', async () => {
    const terra = await criarTerraNoBanco();

    const atualizada = await editarTerra(terra.id, {
      nome: 'Terra Renomeada',
      cidade: 'Araraquara',
      atualizado_por: usuarioId,
    });

    expect(atualizada.id).toBe(terra.id);
    expect(atualizada.nome).toBe('Terra Renomeada');
    expect(atualizada.cidade).toBe('Araraquara');

    const { rows } = await pool.query('SELECT nome, cidade FROM terras WHERE id = $1', [terra.id]);
    expect(rows[0].nome).toBe('Terra Renomeada');
    expect(rows[0].cidade).toBe('Araraquara');
  });

  // CT03 → RN08 (RF012): listagem de terras retorna os registros existentes
  it('lista terras existentes', async () => {
    const terra = await criarTerraNoBanco();
    const lista = await obterTerras();
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.some((t) => t.id === terra.id)).toBe(true);
  });

  // CT04 → RN13 (RF015): parceiros de uma terra existente retornam uma lista
  it('retorna os parceiros de uma terra existente', async () => {
    const terra = await criarTerraNoBanco();
    const parceiros = await obterParceirosDaTerra(terra.id);
    expect(Array.isArray(parceiros)).toBe(true);
  });

  // CT05 → RN14 (RF015): vínculo de parceiro a terra é persistido
  it('vincula um parceiro a uma terra e persiste o vínculo', async () => {
    const terra = await criarTerraNoBanco();
    const parceiro = await criarParceiroNoBanco();

    const vinculo = await vincularParceiroATerra(terra.id, {
      parceiro_id: parceiro.id,
      tipo_vinculo: 'arrendador',
    });

    expect(vinculo.terra_id).toBe(terra.id);
    expect(vinculo.parceiro_id).toBe(parceiro.id);

    const { rows } = await pool.query(
      'SELECT tipo_vinculo FROM parceiro_terra WHERE terra_id = $1 AND parceiro_id = $2',
      [terra.id, parceiro.id]
    );
    expect(rows[0].tipo_vinculo).toBe('arrendador');
  });
});

describe('terraService (unitário, banco real) — caminhos de falha', () => {
  // CT06 → RN10 (RF004): criado_por inexistente é rejeitado
  it('rejeita o cadastro de terra com criado_por inexistente', async () => {
    await expect(
      cadastrarTerra({
        nome: 'Terra Órfã',
        area_contratada_ha: 10,
        cidade: 'Bauru',
        estado: 'SP',
        criado_por: ids.inexistente,
      })
    ).rejects.toThrow('criado_por não referencia um usuário existente');
  });

  // CT07 → RN10 (RF005): edição de terra inexistente retorna não encontrada
  it('rejeita a edição de uma terra inexistente', async () => {
    await expect(
      editarTerra(ids.inexistente, { nome: 'Qualquer', atualizado_por: usuarioId })
    ).rejects.toThrow('Terra não encontrada');
  });

  // CT08 → RN13 (RF015): parceiros de terra inexistente retorna não encontrada
  it('informa quando os parceiros são pedidos para uma terra inexistente', async () => {
    await expect(obterParceirosDaTerra(ids.inexistente)).rejects.toThrow('Terra não encontrada');
  });

  // CT09 → RN13 (RF015): id malformado é tratado como terra não encontrada
  it('trata id malformado nos parceiros da terra como terra não encontrada', async () => {
    await expect(obterParceirosDaTerra(ids.malformado)).rejects.toThrow('Terra não encontrada');
  });

  // CT10 → RN14 (RF015): vínculo em terra inexistente retorna não encontrada
  it('rejeita o vínculo quando a terra não existe', async () => {
    const parceiro = await criarParceiroNoBanco();
    await expect(
      vincularParceiroATerra(ids.inexistente, { parceiro_id: parceiro.id })
    ).rejects.toThrow('Terra não encontrada');
  });

  // CT11 → RN14 (RF015): vínculo com parceiro inexistente é rejeitado
  it('rejeita o vínculo de uma terra com um parceiro inexistente', async () => {
    const terra = await criarTerraNoBanco();
    await expect(
      vincularParceiroATerra(terra.id, { parceiro_id: ids.inexistente })
    ).rejects.toThrow('parceiro_id não referencia um parceiro existente');
  });
});
