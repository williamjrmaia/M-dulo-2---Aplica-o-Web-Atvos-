import pool from '../db/pool';
import { Parceiro, CreateParceiroInput } from '../models/parceiro';

export async function createParceiro(data: CreateParceiroInput): Promise<Parceiro> {
  const { rows } = await pool.query<Parceiro>(
    `INSERT INTO parceiros
       (nome, apelido, tipo_pessoa, cpf_cnpj, email, data_nascimento, nome_acompanhante, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.nome,
      data.apelido ?? null,
      data.tipo_pessoa,
      data.cpf_cnpj,
      data.email ?? null,
      data.data_nascimento ?? null,
      data.nome_acompanhante ?? null,
      data.criado_por,
    ]
  );
  return rows[0];
}
