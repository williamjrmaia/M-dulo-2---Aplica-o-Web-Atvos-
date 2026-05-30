import pool from '../config/connection';
import { Terra, CreateTerraInput, UpdateTerraInput } from '../models/terra';

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
