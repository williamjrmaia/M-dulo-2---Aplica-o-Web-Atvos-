import pool from '../config/connection';
import {
  AprovarParceiroInput,
  Parceiro,
  CreateParceiroInput,
  EnviarParceiroValidacaoInput,
  HistoricoParceiro,
  ListarParceirosFiltros,
  ParceiroTerra,
  TerraDoParceiro,
  UpdateParceiroInput,
  VincularTerraAoParceiroInput,
} from '../models/parceiro';

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

export async function listarParceiros(filtros: ListarParceirosFiltros = {}): Promise<Parceiro[]> {
  const where: string[] = [`p.status != 'inativo'`];
  const valores: unknown[] = [];

  if (filtros.nome !== undefined) {
    valores.push(`%${filtros.nome}%`);
    where.push(`(p.nome ILIKE $${valores.length} OR p.apelido ILIKE $${valores.length})`);
  }

  if (filtros.regiao !== undefined) {
    valores.push(`%${filtros.regiao}%`);
    where.push(
      `EXISTS (
        SELECT 1
          FROM parceiro_terra pt
          JOIN terras t ON t.id = pt.terra_id
         WHERE pt.parceiro_id = p.id
           AND t.status != 'inativo'
           AND (t.cidade ILIKE $${valores.length} OR t.estado ILIKE $${valores.length})
      )`
    );
  }

  if (filtros.area !== undefined) {
    valores.push(filtros.area);
    where.push(
      `EXISTS (
        SELECT 1
          FROM parceiro_terra pt
          JOIN terras t ON t.id = pt.terra_id
         WHERE pt.parceiro_id = p.id
           AND t.status != 'inativo'
           AND t.area_contratada_ha >= $${valores.length}
      )`
    );
  }

  if (filtros.tipo !== undefined) {
    valores.push(filtros.tipo);
    if (['fisica', 'juridica'].includes(filtros.tipo)) {
      where.push(`p.tipo_pessoa = $${valores.length}`);
    } else {
      where.push(
        `EXISTS (
          SELECT 1
            FROM vinculo_comercial vc
           WHERE vc.parceiro_id = p.id
             AND vc.status = 'ativo'
             AND vc.tipo_parceiro = $${valores.length}
        )`
      );
    }
  }

  const { rows } = await pool.query<Parceiro>(
    `SELECT p.*
       FROM parceiros p
      WHERE ${where.join(' AND ')}
      ORDER BY p.criado_em DESC`,
    valores
  );
  return rows;
}

export async function getParceiroById(id: string): Promise<Parceiro | null> {
  const { rows } = await pool.query<Parceiro>(`SELECT * FROM parceiros WHERE id = $1 AND status != 'inativo'`, [id]);
  return rows[0] ?? null;
}

export async function listarHistoricoParceiro(parceiroId: string): Promise<HistoricoParceiro[] | null> {
  const parceiro = await pool.query<{ id: string }>('SELECT id FROM parceiros WHERE id = $1', [parceiroId]);
  if (parceiro.rows.length === 0) {
    return null;
  }

  const { rows } = await pool.query<HistoricoParceiro>(
    `SELECT
        id,
        usuario_id,
        aprovado_por,
        entidade_afetada,
        entidade_id,
        tipo_operacao,
        dados_anteriores,
        dados_novos,
        status,
        comentario,
        data_solicitacao,
        data_aprovacao,
        data_alteracao
       FROM registro_alteracao
      WHERE entidade_id = $1
        AND LOWER(entidade_afetada) IN ('parceiro', 'parceiros')
      ORDER BY data_alteracao DESC`,
    [parceiroId]
  );

  return rows;
}

export async function sendParceiroToValidation(
  id: string,
  data: EnviarParceiroValidacaoInput,
  dadosAnteriores: Parceiro
): Promise<Parceiro | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Parceiro>(
      `UPDATE parceiros
          SET status = 'pendente',
              atualizado_por = $1,
              atualizado_em = NOW()
        WHERE id = $2
          AND status IN ('rascunho', 'devolvido')
        RETURNING *`,
      [data.atualizado_por, id]
    );

    const parceiro = rows[0] ?? null;
    if (!parceiro) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario)
       VALUES ($1, 'parceiro', $2, 'envio', $3::jsonb, $4::jsonb, 'pendente', $5)`,
      [
        data.atualizado_por,
        id,
        JSON.stringify(dadosAnteriores),
        JSON.stringify(parceiro),
        data.comentario ?? null,
      ]
    );

    await client.query('COMMIT');
    return parceiro;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function approveParceiro(
  id: string,
  data: AprovarParceiroInput,
  dadosAnteriores: Parceiro
): Promise<Parceiro | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Parceiro>(
      `UPDATE parceiros
          SET status = 'ativo',
              atualizado_por = $1,
              atualizado_em = NOW()
        WHERE id = $2
          AND status = 'pendente'
        RETURNING *`,
      [data.aprovado_por, id]
    );

    const parceiro = rows[0] ?? null;
    if (!parceiro) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE registro_alteracao
          SET status = 'aprovado',
              aprovado_por = $1,
              data_aprovacao = NOW()
        WHERE entidade_id = $2
          AND LOWER(entidade_afetada) IN ('parceiro', 'parceiros')
          AND status = 'pendente'`,
      [data.aprovado_por, id]
    );

    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, aprovado_por, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario, data_aprovacao)
       VALUES ($1, $1, 'parceiro', $2, 'aprovacao', $3::jsonb, $4::jsonb, 'aprovado', $5, NOW())`,
      [
        data.aprovado_por,
        id,
        JSON.stringify(dadosAnteriores),
        JSON.stringify(parceiro),
        data.comentario ?? null,
      ]
    );

    await client.query('COMMIT');
    return parceiro;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listarTerrasDoParceiro(parceiroId: string): Promise<TerraDoParceiro[] | null> {
  const parceiro = await pool.query<{ id: string }>('SELECT id FROM parceiros WHERE id = $1', [parceiroId]);
  if (parceiro.rows.length === 0) {
    return null;
  }

  const { rows } = await pool.query<TerraDoParceiro>(
    `SELECT
        t.id,
        t.nome,
        t.area_contratada_ha,
        t.cidade,
        t.estado,
        t.status,
        t.criado_em,
        pt.tipo_vinculo
       FROM parceiro_terra pt
       JOIN terras t ON t.id = pt.terra_id
      WHERE pt.parceiro_id = $1
        AND t.status != 'inativo'
      ORDER BY t.criado_em DESC`,
    [parceiroId]
  );

  return rows;
}

export async function createParceiroTerra(
  parceiroId: string,
  data: VincularTerraAoParceiroInput
): Promise<ParceiroTerra | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const parceiro = await client.query<{ id: string }>('SELECT id FROM parceiros WHERE id = $1', [parceiroId]);
    if (parceiro.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const { rows } = await client.query<ParceiroTerra>(
      `INSERT INTO parceiro_terra (parceiro_id, terra_id, tipo_vinculo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [parceiroId, data.terra_id, data.tipo_vinculo ?? null]
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
