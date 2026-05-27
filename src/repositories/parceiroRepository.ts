import pool from '../config/connection';
import { Parceiro, CreateParceiroInput, UpdateParceiroInput } from '../models/parceiro';

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

export async function updateParceiro(id: string, data: UpdateParceiroInput): Promise<Parceiro | null> {
  const campos: string[] = [];
  const valores: any[] = [];
  let contador = 1;

  if (data.nome !== undefined) {
    campos.push(`nome = $${contador++}`);
    valores.push(data.nome);
  }

  if (data.apelido !== undefined) {
    campos.push(`apelido = $${contador++}`);
    valores.push(data.apelido);
  }
  if (data.tipo_pessoa !== undefined) {
    campos.push(`tipo_pessoa = $${contador++}`);
    valores.push(data.tipo_pessoa);
  }
  if (data.cpf_cnpj !== undefined) {
    campos.push(`cpf_cnpj = $${contador++}`);
    valores.push(data.cpf_cnpj);
  }

  if (data.email !== undefined) {
    campos.push(`email = $${contador++}`);
    valores.push(data.email);
  }

  if (data.data_nascimento !== undefined) {
    campos.push(`data_nascimento = $${contador++}`);
    valores.push(data.data_nascimento);
  }

  if (data.nome_acompanhante !== undefined) {
    campos.push(`nome_acompanhante = $${contador++}`);
    valores.push(data.nome_acompanhante);
  }

  if (data.status !== undefined) {
    campos.push(`status = $${contador++}`);
    valores.push(data.status);
  }

  campos.push(`atualizado_por = $${contador}`);
  valores.push(data.atualizado_por);
  campos.push(`atualizado_em = NOW()`);

  contador++;
  valores.push(id);

  const result = await pool.query(
    `UPDATE parceiros SET ${campos.join(', ')} WHERE id = $${contador} RETURNING *`,
    valores
  );
  return result.rows[0] ?? null;
}

export async function listarParceiros(): Promise<Parceiro[]> {
  const { rows } = await pool.query<Parceiro>(`SELECT * FROM parceiros WHERE status != 'inativo'`);
  return rows;
}

export async function getParceiroById(id: string): Promise<Parceiro | null> {
  const { rows } = await pool.query<Parceiro>(`SELECT * FROM parceiros WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
