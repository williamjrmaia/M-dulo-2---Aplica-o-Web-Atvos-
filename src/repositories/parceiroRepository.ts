import pool from '../config/connection';
import { PoolClient } from 'pg';
import {
  AprovarParceiroInput,
  Parceiro,
  CreateParceiroInput,
  DevolverParceiroInput,
  EnviarParceiroValidacaoInput,
  ExcluirParceiroInput,
  HistoricoParceiro,
  ConsultaParceirosOpcoes,
  ListarParceirosFiltros,
  ParceiroPendenteValidacao,
  ParceiroTerra,
  ParceiroRascunhoDevolvido,
  TerraDoParceiro,
  UpdateParceiroInput,
  VincularTerraAoParceiroInput,
} from '../models/parceiro';

function vazioComoNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

type CampoAtualizavelParceiro = {
  chave: keyof UpdateParceiroInput;
  coluna: string;
  transformar?: (valor: NonNullable<UpdateParceiroInput[keyof UpdateParceiroInput]>) => unknown;
};

const CAMPOS_ATUALIZAVEIS_PARCEIRO: CampoAtualizavelParceiro[] = [
  { chave: 'nome', coluna: 'nome' },
  { chave: 'apelido', coluna: 'apelido' },
  { chave: 'tipo_pessoa', coluna: 'tipo_pessoa' },
  { chave: 'cpf_cnpj', coluna: 'cpf_cnpj' },
  { chave: 'email', coluna: 'email' },
  { chave: 'data_nascimento', coluna: 'data_nascimento' },
  { chave: 'nome_acompanhante', coluna: 'nome_acompanhante', transformar: vazioComoNull as never },
  { chave: 'regiao', coluna: 'regiao', transformar: vazioComoNull as never },
  { chave: 'inscricao_estadual', coluna: 'inscricao_estadual', transformar: vazioComoNull as never },
  { chave: 'usina_referencia', coluna: 'usina_referencia', transformar: vazioComoNull as never },
  { chave: 'area_plantada', coluna: 'area_plantada', transformar: vazioComoNull as never },
  { chave: 'tch_medio', coluna: 'tch_medio', transformar: vazioComoNull as never },
  { chave: 'atr_medio', coluna: 'atr_medio', transformar: vazioComoNull as never },
  { chave: 'observacoes', coluna: 'observacoes', transformar: vazioComoNull as never },
  { chave: 'status', coluna: 'status' },
];

function montarCamposAtualizacaoParceiro(data: UpdateParceiroInput): {
  campos: string[];
  valores: unknown[];
  contador: number;
} {
  const campos: string[] = [];
  const valores: unknown[] = [];
  let contador = 1;

  for (const { chave, coluna, transformar } of CAMPOS_ATUALIZAVEIS_PARCEIRO) {
    const valor = data[chave];
    if (valor === undefined) continue;
    campos.push(`${coluna} = $${contador++}`);
    valores.push(transformar ? transformar(valor as never) : valor);
  }

  return { campos, valores, contador };
}

function possuiDadosComerciais(data: VincularTerraAoParceiroInput): boolean {
  return Boolean(
    data.tipo_parceiro ||
      data.modalidade_contrato ||
      data.data_inicio ||
      data.data_fim ||
      data.observacoes
  );
}

function normalizarTelefone(telefone: string | undefined): string | null {
  const texto = telefone?.trim();
  return texto ? texto : null;
}

function comentarioCriacaoParceiro(status: string | undefined): string {
  return status === 'pendente'
    ? 'Parceiro criado e enviado para validação'
    : 'Parceiro criado como rascunho';
}

function telefoneAposAtualizacao(data: UpdateParceiroInput, dadosAnteriores: Parceiro): string | null {
  if (data.telefone !== undefined) {
    return vazioComoNull(data.telefone);
  }
  return dadosAnteriores.telefone ?? null;
}

// Atualiza o telefone principal do parceiro: desmarca o atual e insere o novo.
// Sem alteração de telefone quando o campo não veio na requisição.
async function aplicarTelefoneNaAtualizacao(
  client: PoolClient,
  id: string,
  data: UpdateParceiroInput
): Promise<void> {
  if (data.telefone === undefined) {
    return;
  }

  const telefone = vazioComoNull(data.telefone);

  await client.query(
    `UPDATE telefone_parceiro
        SET principal = FALSE,
            atualizado_por = $2,
            atualizado_em = NOW()
      WHERE parceiro_id = $1
        AND principal = TRUE`,
    [id, data.atualizado_por]
  );

  if (telefone) {
    await client.query(
      `INSERT INTO telefone_parceiro (parceiro_id, numero, tipo, principal, criado_por)
       VALUES ($1, $2, 'celular', TRUE, $3)`,
      [id, telefone, data.atualizado_por]
    );
  }
}

async function inserirVinculoComercial(
  client: PoolClient,
  parceiroId: string,
  data: VincularTerraAoParceiroInput
): Promise<void> {
  await client.query(
    `INSERT INTO vinculo_comercial
       (
        parceiro_id,
        terra_id,
        tipo_parceiro,
        tipo_vinculo,
        modalidade_contrato,
        data_inicio,
        data_fim,
        observacoes
       )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      parceiroId,
      data.terra_id,
      data.tipo_parceiro ?? 'arrendador',
      data.tipo_vinculo ?? 'vinculo comercial',
      vazioComoNull(data.modalidade_contrato),
      data.data_inicio ?? null,
      data.data_fim ?? null,
      vazioComoNull(data.observacoes),
    ]
  );
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
    const telefone = normalizarTelefone(data.telefone);

    if (telefone) {
      await client.query(
        `INSERT INTO telefone_parceiro (parceiro_id, numero, tipo, principal, criado_por)
         VALUES ($1, $2, 'celular', TRUE, $3)`,
        [parceiro.id, telefone, data.criado_por]
      );
    }

    const parceiroCriado = { ...parceiro, telefone };

    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario)
       VALUES ($1, 'parceiro', $2, 'criacao', NULL, $3::jsonb, 'aprovado', $4)`,
      [
        data.criado_por,
        parceiro.id,
        JSON.stringify(parceiroCriado),
        comentarioCriacaoParceiro(data.status),
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
  const { campos, valores, contador: contadorAposCampos } = montarCamposAtualizacaoParceiro(data);
  let contador = contadorAposCampos;

  campos.push(`atualizado_por = $${contador}`);
  valores.push(data.atualizado_por);
  campos.push(`atualizado_em = NOW()`);

  contador++;
  valores.push(id);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: anteriores } = await client.query<Parceiro>(
      `SELECT p.*,
              (
                SELECT numero
                  FROM telefone_parceiro
                 WHERE parceiro_id = p.id
                   AND principal = TRUE
                 ORDER BY criado_em DESC
                 LIMIT 1
              ) AS telefone
         FROM parceiros p
        WHERE p.id = $1
        FOR UPDATE`,
      [id]
    );

    const dadosAnteriores = anteriores[0];
    if (!dadosAnteriores) {
      await client.query('ROLLBACK');
      return null;
    }

    const result = await client.query<Parceiro>(
      `UPDATE parceiros SET ${campos.join(', ')} WHERE id = $${contador} RETURNING *`,
      valores
    );
    const parceiro = result.rows[0];

    if (!parceiro) {
      await client.query('ROLLBACK');
      return null;
    }

    await aplicarTelefoneNaAtualizacao(client, id, data);

    const parceiroAtualizado = {
      ...parceiro,
      telefone: telefoneAposAtualizacao(data, dadosAnteriores),
    };

    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario)
       VALUES ($1, 'parceiro', $2, 'edicao', $3::jsonb, $4::jsonb, 'aprovado', $5)`,
      [
        data.atualizado_por,
        id,
        JSON.stringify(dadosAnteriores),
        JSON.stringify(parceiroAtualizado),
        'Parceiro atualizado',
      ]
    );

    await client.query('COMMIT');
    return parceiroAtualizado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function aplicarFiltrosVisibilidade(
  opcoes: ConsultaParceirosOpcoes,
  where: string[],
  valores: unknown[]
): void {
  if (!opcoes.incluirInativos) {
    where.push(`p.status != 'inativo'`);
  }

  if (opcoes.rascunhosUsuarioId) {
    valores.push(opcoes.rascunhosUsuarioId);
    where.push(`(p.status != 'rascunho' OR p.criado_por = $${valores.length})`);
  }
}

function aplicarFiltroNome(
  filtros: ListarParceirosFiltros,
  where: string[],
  valores: unknown[]
): void {
  if (filtros.nome === undefined) {
    return;
  }
  valores.push(`%${filtros.nome}%`);
  where.push(
    `(p.nome ILIKE $${valores.length}
      OR p.apelido ILIKE $${valores.length}
      OR p.cpf_cnpj ILIKE $${valores.length}
      OR p.email ILIKE $${valores.length})`
  );
}

function aplicarFiltroRegiao(
  filtros: ListarParceirosFiltros,
  where: string[],
  valores: unknown[]
): void {
  if (filtros.regiao === undefined) {
    return;
  }
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

function aplicarFiltroArea(
  filtros: ListarParceirosFiltros,
  where: string[],
  valores: unknown[]
): void {
  if (filtros.area === undefined) {
    return;
  }
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

function aplicarFiltroTipo(
  filtros: ListarParceirosFiltros,
  where: string[],
  valores: unknown[]
): void {
  if (filtros.tipo === undefined) {
    return;
  }
  valores.push(filtros.tipo);
  if (['fisica', 'juridica'].includes(filtros.tipo)) {
    where.push(`p.tipo_pessoa = $${valores.length}`);
    return;
  }
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

function aplicarFiltroStatus(
  filtros: ListarParceirosFiltros,
  where: string[],
  valores: unknown[]
): void {
  if (filtros.status === undefined) {
    return;
  }
  valores.push(filtros.status);
  where.push(`p.status = $${valores.length}::status_validacao`);
}

function aplicarFiltroUsina(
  filtros: ListarParceirosFiltros,
  where: string[],
  valores: unknown[]
): void {
  if (filtros.usina_referencia === undefined) {
    return;
  }
  valores.push(`%${filtros.usina_referencia}%`);
  where.push(`p.usina_referencia ILIKE $${valores.length}`);
}

export async function listarParceiros(
  filtros: ListarParceirosFiltros = {},
  opcoes: ConsultaParceirosOpcoes = {}
): Promise<Parceiro[]> {
  const where: string[] = [];
  const valores: unknown[] = [];

  aplicarFiltrosVisibilidade(opcoes, where, valores);
  aplicarFiltroNome(filtros, where, valores);
  aplicarFiltroRegiao(filtros, where, valores);
  aplicarFiltroArea(filtros, where, valores);
  aplicarFiltroTipo(filtros, where, valores);
  aplicarFiltroStatus(filtros, where, valores);
  aplicarFiltroUsina(filtros, where, valores);

  const { rows } = await pool.query<Parceiro>(
    `SELECT p.*,
            criador.nome AS criado_por_nome,
            atualizador.nome AS atualizado_por_nome,
            tp.numero AS telefone
       FROM parceiros p
       LEFT JOIN usuarios criador ON criador.id = p.criado_por
       LEFT JOIN usuarios atualizador ON atualizador.id = p.atualizado_por
       LEFT JOIN LATERAL (
         SELECT numero
           FROM telefone_parceiro
          WHERE parceiro_id = p.id
            AND ativo = TRUE
          ORDER BY principal DESC, criado_em DESC
          LIMIT 1
       ) tp ON TRUE
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY p.criado_em DESC`,
    valores
  );
  return rows;
}

export async function listarPendentesValidacao(): Promise<ParceiroPendenteValidacao[]> {
  const { rows } = await pool.query<ParceiroPendenteValidacao>(
    `SELECT
        p.*,
        criador.nome AS criado_por_nome,
        atualizador.nome AS atualizado_por_nome,
        ultimo_envio.data_alteracao AS data_envio
       FROM parceiros p
       LEFT JOIN usuarios criador ON criador.id = p.criado_por
       LEFT JOIN usuarios atualizador ON atualizador.id = p.atualizado_por
       LEFT JOIN LATERAL (
         SELECT ra.data_alteracao
           FROM registro_alteracao ra
          WHERE ra.entidade_id = p.id
            AND LOWER(ra.entidade_afetada) IN ('parceiro', 'parceiros')
            AND ra.tipo_operacao = 'envio'
          ORDER BY ra.data_alteracao DESC
          LIMIT 1
       ) ultimo_envio ON TRUE
      WHERE p.status = 'pendente'
      ORDER BY ultimo_envio.data_alteracao DESC NULLS LAST,
               p.atualizado_em DESC NULLS LAST,
               p.criado_em DESC`
  );

  return rows;
}

export async function listarRascunhosDevolvidosDoAnalista(
  analistaId: string
): Promise<ParceiroRascunhoDevolvido[]> {
  const { rows } = await pool.query<ParceiroRascunhoDevolvido>(
    `SELECT
        p.*,
        ultima_devolucao.comentario AS comentario_devolucao,
        ultima_devolucao.data_alteracao AS data_devolucao
       FROM parceiros p
       LEFT JOIN LATERAL (
         SELECT ra.comentario, ra.data_alteracao
           FROM registro_alteracao ra
          WHERE ra.entidade_id = p.id
            AND LOWER(ra.entidade_afetada) IN ('parceiro', 'parceiros')
            AND ra.tipo_operacao = 'devolucao'
          ORDER BY ra.data_alteracao DESC
          LIMIT 1
       ) ultima_devolucao ON TRUE
      WHERE p.criado_por = $1
        AND p.status IN ('rascunho', 'devolvido')
      ORDER BY p.atualizado_em DESC NULLS LAST, p.criado_em DESC`,
    [analistaId]
  );

  return rows;
}

export async function getParceiroById(
  id: string,
  opcoes: ConsultaParceirosOpcoes = {}
): Promise<Parceiro | null> {
  const valores: unknown[] = [id];
  const where: string[] = ['p.id = $1'];

  if (!opcoes.incluirInativos) {
    where.push(`p.status != 'inativo'`);
  }

  if (opcoes.rascunhosUsuarioId) {
    valores.push(opcoes.rascunhosUsuarioId);
    where.push(`(p.status != 'rascunho' OR p.criado_por = $${valores.length})`);
  }

  const { rows } = await pool.query<Parceiro>(
    `SELECT p.*,
            criador.nome AS criado_por_nome,
            atualizador.nome AS atualizado_por_nome,
            tp.numero AS telefone,
            ultima_devolucao.comentario AS comentario_devolucao,
            ultima_devolucao.data_alteracao AS data_devolucao
       FROM parceiros p
       LEFT JOIN usuarios criador ON criador.id = p.criado_por
       LEFT JOIN usuarios atualizador ON atualizador.id = p.atualizado_por
       LEFT JOIN LATERAL (
         SELECT numero
           FROM telefone_parceiro
          WHERE parceiro_id = p.id
            AND ativo = TRUE
          ORDER BY principal DESC, criado_em DESC
          LIMIT 1
       ) tp ON TRUE
       LEFT JOIN LATERAL (
         SELECT ra.comentario, ra.data_alteracao
           FROM registro_alteracao ra
          WHERE ra.entidade_id = p.id
            AND LOWER(ra.entidade_afetada) IN ('parceiro', 'parceiros')
            AND ra.tipo_operacao = 'devolucao'
          ORDER BY ra.data_alteracao DESC
          LIMIT 1
       ) ultima_devolucao ON TRUE
      WHERE ${where.join(' AND ')}`,
    valores
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

export async function deactivateParceiro(
  id: string,
  data: ExcluirParceiroInput,
  dadosAnteriores: Parceiro
): Promise<Parceiro | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Parceiro>(
      `UPDATE parceiros
          SET status = 'inativo',
              atualizado_por = $1,
              atualizado_em = NOW()
        WHERE id = $2
          AND status != 'inativo'
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
       VALUES ($1, 'parceiro', $2, 'exclusao', $3::jsonb, $4::jsonb, 'aprovado', $5)`,
      [
        data.atualizado_por,
        id,
        JSON.stringify(dadosAnteriores),
        JSON.stringify(parceiro),
        data.comentario ?? 'Parceiro inativado',
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

export async function listarTerrasDoParceiro(
  parceiroId: string,
  opcoes: ConsultaParceirosOpcoes = {}
): Promise<TerraDoParceiro[] | null> {
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
        ${opcoes.incluirInativos ? '' : "AND t.status != 'inativo'"}
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

    const parceiro = await client.query<{ id: string; criado_por: string }>(
      'SELECT id, criado_por FROM parceiros WHERE id = $1',
      [parceiroId]
    );
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

    const vinculo = rows[0];

    if (possuiDadosComerciais(data)) {
      await inserirVinculoComercial(client, parceiroId, data);
    }

    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario)
       VALUES ($1, 'parceiro_terra', $2, 'criacao', NULL, $3::jsonb, 'aprovado', $4)`,
      [
        parceiro.rows[0].criado_por,
        vinculo.id,
        JSON.stringify(vinculo),
        'Vínculo parceiro-terra criado',
      ]
    );

    await client.query('COMMIT');
    return vinculo;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
