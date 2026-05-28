import pool from '../config/connection';
import { PerfilAcesso } from '../models/PerfilAcesso';
import { UsuarioComPerfil } from '../models/Usuario';

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
      [email],
    );
    const usuario = result.rows[0] ?? null;
    console.log('[REPOSITORY] buscarPorEmail retornou:', usuario ? 'usuário encontrado' : 'null');
    return usuario;
  }

  async checarExistenciaPerfil(role_id: string): Promise<boolean> {
    console.log(`[REPOSITORY] checarExistenciaPerfil: ${role_id}`);
    const result = await pool.query<{ id: string }>(
      'SELECT id FROM perfil_acesso WHERE id = $1',
      [role_id],
    );
    return result.rows.length > 0;
  }

  async buscarPorId(id: string): Promise<UsuarioComPerfil | null> {
    console.log(`[REPOSITORY] buscarPorId usuario: ${id}`);
    const result = await pool.query<UsuarioComPerfil>(
      `SELECT u.id, u.perfil_acesso_id, u.nome, u.email, u.senha_hash, u.ativo, u.criado_em,
              pa.nome AS perfil
         FROM usuarios u
         JOIN perfil_acesso pa ON pa.id = u.perfil_acesso_id
        WHERE u.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async listarPerfis(): Promise<PerfilAcesso[]> {
    console.log('[REPOSITORY] listarPerfis');
    const result = await pool.query<PerfilAcesso>(
      'SELECT id, nome, requer_aprovacao, descricao FROM perfil_acesso ORDER BY nome',
    );
    return result.rows;
  }

  async atualizaPerfilDeAcesso(id: string, role_id: string): Promise<UsuarioComPerfil | null> {
    console.log(`[REPOSITORY] atualizaPerfilDeAcesso usuario: ${id}, perfil: ${role_id}`);
    const result = await pool.query<UsuarioComPerfil>(
      `UPDATE usuarios
          SET perfil_acesso_id = $1
        WHERE id = $2
        RETURNING id, perfil_acesso_id, nome, email, senha_hash, ativo, criado_em`,
      [role_id, id],
    );
    return result.rows[0] ?? null;
  }
}