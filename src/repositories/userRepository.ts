import pool from '../config/connection';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha_hash: string | null;
  ativo: boolean;
  perfil_acesso_id: string;
}

export class UserRepository {
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    console.log(`[REPOSITORY] buscarPorEmail: ${email}`);

    const result = await pool.query<Usuario>(
      'SELECT id, nome, email, senha_hash, ativo, perfil_acesso_id FROM usuarios WHERE email = $1',
      [email]
    );

    const usuario = result.rows[0] ?? null;
    console.log('[REPOSITORY] buscarPorEmail retornou:', usuario ? 'usuário encontrado' : 'null');
    return usuario;
  }
}