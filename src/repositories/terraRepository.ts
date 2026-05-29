import pool from '../config/connection';
import { Terra, CreateTerraInput } from '../models/terra';

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
