import pool from '../../config/connection';

const UUID_VALIDO_INEXISTENTE = '00000000-0000-0000-0000-0000000000ff';
const UUID_MALFORMADO = 'id-nao-uuid';

export const ids = {
  inexistente: UUID_VALIDO_INEXISTENTE,
  malformado: UUID_MALFORMADO,
};

export async function garantirPerfis(): Promise<Record<string, string>> {
  await pool.query(
    `INSERT INTO perfil_acesso (nome, requer_aprovacao)
     VALUES ('analista', false), ('coordenador', true), ('administrador', false)
     ON CONFLICT (nome) DO NOTHING`
  );
  const { rows } = await pool.query<{ id: string; nome: string }>(
    `SELECT id, nome FROM perfil_acesso WHERE nome IN ('analista', 'coordenador', 'administrador')`
  );
  return Object.fromEntries(rows.map((r) => [r.nome, r.id]));
}

interface CriarUsuarioParams {
  email: string;
  perfilId: string;
  nome?: string;
  ativo?: boolean;
}

export async function criarUsuario(p: CriarUsuarioParams): Promise<{ id: string }> {
  await removerUsuarioPorEmail(p.email);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO usuarios (perfil_acesso_id, nome, email, ativo)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [p.perfilId, p.nome ?? 'Usuario Teste', p.email, p.ativo ?? true]
  );
  return rows[0];
}

export async function removerUsuarioPorEmail(email: string): Promise<void> {
  // Remove o usuario de teste e toda a cadeia de dados que o referencia.
  // As FKs para usuarios (criado_por, atualizado_por, usuario_id, registrado_por,
  // aprovado_por) NAO tem ON DELETE CASCADE, entao precisamos limpar na ordem certa.
  // Auto-saneador: se um run anterior caiu (rede/timeout) e deixou orfaos, o
  // proximo beforeEach -> criarUsuario -> este helper limpa tudo antes de recriar.
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM usuarios WHERE email = $1',
    [email]
  );
  if (rows.length === 0) return;
  const usuarioId = rows[0].id;

  // Parceiros e terras criados por este usuario (dado de teste, seguro apagar).
  const { rows: parceiroRows } = await pool.query<{ id: string }>(
    'SELECT id FROM parceiros WHERE criado_por = $1',
    [usuarioId]
  );
  const { rows: terraRows } = await pool.query<{ id: string }>(
    'SELECT id FROM terras WHERE criado_por = $1',
    [usuarioId]
  );
  const parceiroIds = parceiroRows.map((r) => r.id);
  const terraIds = terraRows.map((r) => r.id);

  // Filhos de parceiros/terras.
  await pool.query(
    `DELETE FROM vinculo_comercial WHERE parceiro_id = ANY($1::uuid[]) OR terra_id = ANY($2::uuid[])`,
    [parceiroIds, terraIds]
  );
  await pool.query(
    `DELETE FROM parceiro_terra WHERE parceiro_id = ANY($1::uuid[]) OR terra_id = ANY($2::uuid[])`,
    [parceiroIds, terraIds]
  );
  await pool.query(`DELETE FROM parceiro_unidade WHERE parceiro_id = ANY($1::uuid[])`, [parceiroIds]);
  await pool.query(`DELETE FROM terra_unidade WHERE terra_id = ANY($1::uuid[])`, [terraIds]);
  await pool.query(
    `DELETE FROM telefone_parceiro WHERE parceiro_id = ANY($1::uuid[]) OR criado_por = $2 OR atualizado_por = $2`,
    [parceiroIds, usuarioId]
  );
  await pool.query(
    `DELETE FROM parceiro_coordenador WHERE parceiro_id = ANY($1::uuid[]) OR usuario_id = $2`,
    [parceiroIds, usuarioId]
  );
  await pool.query(
    `DELETE FROM interacao WHERE parceiro_id = ANY($1::uuid[]) OR registrado_por = $2`,
    [parceiroIds, usuarioId]
  );

  // Registros de alteracao ligados ao usuario ou as entidades dele.
  await pool.query(
    `DELETE FROM registro_alteracao
      WHERE usuario_id = $1 OR aprovado_por = $1 OR entidade_id = $1
         OR entidade_id = ANY($2::uuid[]) OR entidade_id = ANY($3::uuid[])`,
    [usuarioId, parceiroIds, terraIds]
  );

  // Solta FKs em linhas que o usuario apenas atualizou (sem ter criado).
  await pool.query(
    'UPDATE parceiros SET atualizado_por = NULL WHERE atualizado_por = $1 AND criado_por <> $1',
    [usuarioId]
  );
  await pool.query(
    'UPDATE terras SET atualizado_por = NULL WHERE atualizado_por = $1 AND criado_por <> $1',
    [usuarioId]
  );

  // Parceiros e terras do usuario, depois vinculos diretos e o proprio usuario.
  await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [parceiroIds]);
  await pool.query(`DELETE FROM terras WHERE id = ANY($1::uuid[])`, [terraIds]);
  await pool.query('DELETE FROM usuario_unidade WHERE usuario_id = $1', [usuarioId]);
  // auth_sessoes e primeiro_acesso_tokens caem por ON DELETE CASCADE.
  await pool.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
}

export async function lerUsuario(id: string): Promise<{
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfil_acesso_id: string;
} | null> {
  const { rows } = await pool.query(
    'SELECT id, nome, email, ativo, perfil_acesso_id FROM usuarios WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}
