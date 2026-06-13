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
  // Apaga primeiro os filhos em registro_alteracao (FK), depois o usuario.
  await pool.query(
    `DELETE FROM registro_alteracao
      WHERE usuario_id = (SELECT id FROM usuarios WHERE email = $1)
         OR aprovado_por = (SELECT id FROM usuarios WHERE email = $1)
         OR entidade_id = (SELECT id FROM usuarios WHERE email = $1)`,
    [email]
  );
  await pool.query('DELETE FROM usuarios WHERE email = $1', [email]);
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
