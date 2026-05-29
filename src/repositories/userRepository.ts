import pool from '../config/connection';
import { PerfilAcesso } from '../models/PerfilAcesso';
import { AtualizarUsuarioDTO, UsuarioComPerfil } from '../models/Usuario';

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
    return result.rows[0] ?? null;
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

  async atualizaUsuario(id: string, dados: AtualizarUsuarioDTO): Promise<UsuarioComPerfil | null> {
    console.log(`[REPOSITORY] atualizaUsuario: ${id}`);

    const campos: string[] = [];
    const valores: unknown[] = [];
    let contador = 1;

    if (dados.nome !== undefined) {
      campos.push(`nome = $${contador++}`);
      valores.push(dados.nome);
    }

    if (dados.email !== undefined) {
      campos.push(`email = $${contador++}`);
      valores.push(dados.email);
    }

    if (dados.ativo !== undefined) {
      campos.push(`ativo = $${contador++}`);
      valores.push(dados.ativo);
    }

    if (dados.perfil_acesso_id !== undefined) {
      campos.push(`perfil_acesso_id = $${contador++}`);
      valores.push(dados.perfil_acesso_id);
    }

    valores.push(id);

    const result = await pool.query<UsuarioComPerfil>(
      `UPDATE usuarios
          SET ${campos.join(', ')}
        WHERE id = $${contador}
        RETURNING id, perfil_acesso_id, nome, email, senha_hash, ativo, criado_em`,
      valores,
    );
    return result.rows[0] ?? null;
  }

  async inativarUsuario(id: string): Promise<UsuarioComPerfil | null> {
    console.log(`[REPOSITORY] inativarUsuario: ${id}`);
    const result = await pool.query<UsuarioComPerfil>(
      `UPDATE usuarios
          SET ativo = FALSE
        WHERE id = $1
        RETURNING id, perfil_acesso_id, nome, email, senha_hash, ativo, criado_em`,
      [id],
    );
    return result.rows[0] ?? null;
  }
}