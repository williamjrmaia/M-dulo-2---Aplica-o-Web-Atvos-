import pool from '../config/connection';
import {
  Terra,
  CreateTerraInput,
  ExcluirTerraInput,
  ParceiroDaTerra,
  TerraParceiro,
  UpdateTerraInput,
  VincularParceiroATerraInput,
} from '../models/terra';

export async function createTerra(data: CreateTerraInput): Promise<Terra> {
  const { rows } = await pool.query<Terra>(
    `INSERT INTO terras (nome, area_contratada_ha, cidade, estado, status, criado_por)
     VALUES ($1, $2, $3, $4, COALESCE($5::status_validacao, 'rascunho'), $6)
     RETURNING *`,
    [
      data.nome,
      data.area_contratada_ha,
      data.cidade,
      data.estado,
      data.status ?? null,
      data.criado_por,
    ]
  );
  return rows[0];
}

export async function listarTerras(): Promise<Terra[]> {
  const { rows } = await pool.query<Terra>(
    `SELECT *
       FROM terras
      WHERE status != 'inativo'
      ORDER BY criado_em DESC`
  );
  return rows;
}

export async function getTerraById(id: string): Promise<Terra | null> {
  const { rows } = await pool.query<Terra>('SELECT * FROM terras WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function updateTerra(id: string, data: UpdateTerraInput): Promise<Terra | null> {
  const campos: string[] = [];
  const valores: unknown[] = [];
  let contador = 1;

  if (data.nome !== undefined) {
    campos.push(`nome = $${contador++}`);
    valores.push(data.nome);
  }

  if (data.area_contratada_ha !== undefined) {
    campos.push(`area_contratada_ha = $${contador++}`);
    valores.push(data.area_contratada_ha);
  }

  if (data.cidade !== undefined) {
    campos.push(`cidade = $${contador++}`);
    valores.push(data.cidade);
  }

  if (data.estado !== undefined) {
    campos.push(`estado = $${contador++}`);
    valores.push(data.estado);
  }

  if (data.status !== undefined) {
    campos.push(`status = $${contador++}::status_validacao`);
    valores.push(data.status);
  }

  campos.push(`atualizado_por = $${contador++}`);
  valores.push(data.atualizado_por);
  campos.push('atualizado_em = NOW()');

  valores.push(id);

  const { rows } = await pool.query<Terra>(
    `UPDATE terras
        SET ${campos.join(', ')}
      WHERE id = $${contador}
      RETURNING *`,
    valores
  );

  return rows[0] ?? null;
}

export async function deactivateTerra(
  id: string,
  data: ExcluirTerraInput,
  dadosAnteriores: Terra
): Promise<Terra | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Terra>(
      `UPDATE terras
          SET status = 'inativo',
              atualizado_por = $1,
              atualizado_em = NOW()
        WHERE id = $2
          AND status != 'inativo'
        RETURNING *`,
      [data.atualizado_por, id]
    );

    const terra = rows[0] ?? null;
    if (!terra) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario)
       VALUES ($1, 'terra', $2, 'exclusao', $3::jsonb, $4::jsonb, 'aprovado', $5)`,
      [
        data.atualizado_por,
        id,
        JSON.stringify(dadosAnteriores),
        JSON.stringify(terra),
        data.comentario ?? 'Terra inativada',
      ]
    );

    await client.query('COMMIT');
    return terra;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listarParceirosDaTerra(terraId: string): Promise<ParceiroDaTerra[] | null> {
  const terra = await pool.query<{ id: string }>('SELECT id FROM terras WHERE id = $1', [terraId]);
  if (terra.rows.length === 0) {
    return null;
  }

  const { rows } = await pool.query<ParceiroDaTerra>(
    `SELECT
        p.id,
        p.nome,
        p.apelido,
        p.tipo_pessoa,
        p.cpf_cnpj,
        p.email,
        p.status,
        p.criado_em,
        pt.tipo_vinculo
       FROM parceiro_terra pt
       JOIN parceiros p ON p.id = pt.parceiro_id
      WHERE pt.terra_id = $1
        AND p.status != 'inativo'
      ORDER BY p.criado_em DESC`,
    [terraId]
  );

  return rows;
}

export async function createTerraParceiro(
  terraId: string,
  data: VincularParceiroATerraInput
): Promise<TerraParceiro | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const terra = await client.query<{ id: string }>('SELECT id FROM terras WHERE id = $1', [terraId]);
    if (terra.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const { rows } = await client.query<TerraParceiro>(
      `INSERT INTO parceiro_terra (terra_id, parceiro_id, tipo_vinculo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [terraId, data.parceiro_id, data.tipo_vinculo ?? null]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
