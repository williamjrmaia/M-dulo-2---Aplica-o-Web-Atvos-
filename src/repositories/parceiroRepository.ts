import pool from '../config/connection';
import {
  AprovarParceiroInput,
  Parceiro,
  CreateParceiroInput,
  DevolverParceiroInput,
  EnviarParceiroValidacaoInput,
  HistoricoParceiro,
  ListarParceirosFiltros,
  ParceiroTerra,
  TerraDoParceiro,
  UpdateParceiroInput,
  VincularTerraAoParceiroInput,
} from '../models/parceiro';

function vazioComoNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

export async function createParceiro(data: CreateParceiroInput): Promise<Parceiro> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Parceiro>(
      `INSERT INTO parceiros
         (
          nome,
          apelido,
          tipo_pessoa,
          cpf_cnpj,
          email,
          data_nascimento,
          nome_acompanhante,
          regiao,
          inscricao_estadual,
          usina_referencia,
          area_plantada,
          tch_medio,
          atr_medio,
          observacoes,
          status,
          criado_por
         )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::status_validacao, $16)
       RETURNING *`,
      [
        data.nome,
        vazioComoNull(data.apelido),
        data.tipo_pessoa,
        data.cpf_cnpj,
        vazioComoNull(data.email),
        vazioComoNull(data.data_nascimento),
        vazioComoNull(data.nome_acompanhante),
        vazioComoNull(data.regiao),
        vazioComoNull(data.inscricao_estadual),
        vazioComoNull(data.usina_referencia),
        vazioComoNull(data.area_plantada),
        vazioComoNull(data.tch_medio),
        vazioComoNull(data.atr_medio),
        vazioComoNull(data.observacoes),
        data.status ?? 'rascunho',
        data.criado_por,
      ]
    );

    const parceiro = rows[0];

    if (data.telefone && data.telefone.trim()) {
      await client.query(
        `INSERT INTO telefone_parceiro (parceiro_id, numero, tipo, principal, criado_por)
         VALUES ($1, $2, 'celular', TRUE, $3)`,
        [parceiro.id, data.telefone.trim(), data.criado_por]
      );
    }

    const parceiroCriado = { ...parceiro, telefone: data.telefone?.trim() || null };

    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario)
       VALUES ($1, 'parceiro', $2, 'criacao', NULL, $3::jsonb, 'aprovado', $4)`,
      [
        data.criado_por,
        parceiro.id,
        JSON.stringify(parceiroCriado),
        data.status === 'pendente' ? 'Parceiro criado e enviado para validação' : 'Parceiro criado como rascunho',
      ]
    );

    await client.query('COMMIT');
    return parceiroCriado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
    valores.push(vazioComoNull(data.nome_acompanhante));
  }

  if (data.regiao !== undefined) {
    campos.push(`regiao = $${contador++}`);
    valores.push(vazioComoNull(data.regiao));
  }

  if (data.inscricao_estadual !== undefined) {
    campos.push(`inscricao_estadual = $${contador++}`);
    valores.push(vazioComoNull(data.inscricao_estadual));
  }

  if (data.usina_referencia !== undefined) {
    campos.push(`usina_referencia = $${contador++}`);
    valores.push(vazioComoNull(data.usina_referencia));
  }

  if (data.area_plantada !== undefined) {
    campos.push(`area_plantada = $${contador++}`);
    valores.push(vazioComoNull(data.area_plantada));
  }

  if (data.tch_medio !== undefined) {
    campos.push(`tch_medio = $${contador++}`);
    valores.push(vazioComoNull(data.tch_medio));
  }

  if (data.atr_medio !== undefined) {
    campos.push(`atr_medio = $${contador++}`);
    valores.push(vazioComoNull(data.atr_medio));
  }

  if (data.observacoes !== undefined) {
    campos.push(`observacoes = $${contador++}`);
    valores.push(vazioComoNull(data.observacoes));
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

  const result = await pool.query<Parceiro>(
    `UPDATE parceiros SET ${campos.join(', ')} WHERE id = $${contador} RETURNING *`,
    valores
  );
  const parceiro = result.rows[0] ?? null;

  if (parceiro && data.telefone !== undefined) {
    const telefone = vazioComoNull(data.telefone);
    await pool.query(
      `UPDATE telefone_parceiro
          SET principal = FALSE,
              atualizado_por = $2,
              atualizado_em = NOW()
        WHERE parceiro_id = $1
          AND principal = TRUE`,
      [id, data.atualizado_por]
    );

    if (telefone) {
      await pool.query(
        `INSERT INTO telefone_parceiro (parceiro_id, numero, tipo, principal, criado_por)
         VALUES ($1, $2, 'celular', TRUE, $3)`,
        [id, telefone, data.atualizado_por]
      );
    }
  }

  return parceiro ? { ...parceiro, telefone: data.telefone ?? null } : null;
}

export async function listarParceiros(filtros: ListarParceirosFiltros = {}): Promise<Parceiro[]> {
  const where: string[] = [`p.status != 'inativo'`];
  const valores: unknown[] = [];

  if (filtros.nome !== undefined) {
    valores.push(`%${filtros.nome}%`);
    where.push(
      `(p.nome ILIKE $${valores.length}
        OR p.apelido ILIKE $${valores.length}
        OR p.cpf_cnpj ILIKE $${valores.length}
        OR p.email ILIKE $${valores.length})`
    );
  }

  if (filtros.regiao !== undefined) {
    valores.push(`%${filtros.regiao}%`);
    where.push(
      `(p.regiao ILIKE $${valores.length}
        OR EXISTS (
          SELECT 1
            FROM parceiro_terra pt
            JOIN terras t ON t.id = pt.terra_id
           WHERE pt.parceiro_id = p.id
             AND t.status != 'inativo'
             AND (t.cidade ILIKE $${valores.length} OR t.estado ILIKE $${valores.length})
        ))`
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

  if (filtros.status !== undefined) {
    valores.push(filtros.status);
    where.push(`p.status = $${valores.length}::status_validacao`);
  }

  if (filtros.usina_referencia !== undefined) {
    valores.push(`%${filtros.usina_referencia}%`);
    where.push(`p.usina_referencia ILIKE $${valores.length}`);
  }

  const { rows } = await pool.query<Parceiro>(
    `SELECT p.*,
            tp.numero AS telefone
       FROM parceiros p
       LEFT JOIN LATERAL (
         SELECT numero
           FROM telefone_parceiro
          WHERE parceiro_id = p.id
            AND ativo = TRUE
          ORDER BY principal DESC, criado_em DESC
          LIMIT 1
       ) tp ON TRUE
      WHERE ${where.join(' AND ')}
      ORDER BY p.criado_em DESC`,
    valores
  );
  return rows;
}

export async function getParceiroById(id: string): Promise<Parceiro | null> {
  const { rows } = await pool.query<Parceiro>(
    `SELECT p.*,
            tp.numero AS telefone
       FROM parceiros p
       LEFT JOIN LATERAL (
         SELECT numero
           FROM telefone_parceiro
          WHERE parceiro_id = p.id
            AND ativo = TRUE
          ORDER BY principal DESC, criado_em DESC
          LIMIT 1
       ) tp ON TRUE
      WHERE p.id = $1
        AND p.status != 'inativo'`,
    [id]
  );
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

export async function returnParceiroForAdjustment(
  id: string,
  data: DevolverParceiroInput,
  dadosAnteriores: Parceiro
): Promise<Parceiro | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Parceiro>(
      `UPDATE parceiros
          SET status = 'devolvido',
              atualizado_por = $1,
              atualizado_em = NOW()
        WHERE id = $2
          AND status = 'pendente'
        RETURNING *`,
      [data.devolvido_por, id]
    );

    const parceiro = rows[0] ?? null;
    if (!parceiro) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE registro_alteracao
          SET status = 'devolvido'
        WHERE entidade_id = $1
          AND LOWER(entidade_afetada) IN ('parceiro', 'parceiros')
          AND status = 'pendente'`,
      [id]
    );

    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario)
       VALUES ($1, 'parceiro', $2, 'devolucao', $3::jsonb, $4::jsonb, 'devolvido', $5)`,
      [
        data.devolvido_por,
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
