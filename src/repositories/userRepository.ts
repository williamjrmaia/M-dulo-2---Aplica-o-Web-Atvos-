import pool from '../config/connection';
import { PoolClient } from 'pg';
import { PerfilAcesso } from '../models/PerfilAcesso';
import { AtualizarUsuarioDTO, CriarUsuarioInput, UsuarioComPerfil } from '../models/Usuario';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha_hash: string | null;
  ativo: boolean;
  perfil_acesso_id: string;
}

export class UserRepository {
  private dadosAuditaveisUsuario(usuario: UsuarioComPerfil): Omit<UsuarioComPerfil, 'senha_hash'> {
    const { senha_hash, ...dados } = usuario;
    return dados;
  }

  private async registrarAlteracaoUsuario(
    client: PoolClient,
    usuarioId: string,
    dadosAnteriores: UsuarioComPerfil,
    dadosNovos: UsuarioComPerfil,
    comentario: string
  ): Promise<void> {
    await client.query(
      `INSERT INTO registro_alteracao
         (usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario)
       VALUES ($1, 'usuario', $2, 'edicao', $3::jsonb, $4::jsonb, 'aprovado', $5)`,
      [
        usuarioId,
        usuarioId,
        JSON.stringify(this.dadosAuditaveisUsuario(dadosAnteriores)),
        JSON.stringify(this.dadosAuditaveisUsuario(dadosNovos)),
        comentario,
      ],
    );
  }

  // Centraliza o fluxo transacional auditado (BEGIN, SELECT FOR UPDATE, UPDATE
  // específico via callback, registro de alteração e COMMIT/ROLLBACK).
  private async executarComAuditoria(
    id: string,
    comentario: string,
    aplicar: (client: PoolClient, dadosAnteriores: UsuarioComPerfil) => Promise<UsuarioComPerfil | null>,
  ): Promise<UsuarioComPerfil | null> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const anterior = await client.query<UsuarioComPerfil>(
        `SELECT id, perfil_acesso_id, nome, email, senha_hash, ativo, criado_em
           FROM usuarios
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );

      const dadosAnteriores = anterior.rows[0] ?? null;
      if (!dadosAnteriores) {
        await client.query('ROLLBACK');
        return null;
      }

      const usuario = await aplicar(client, dadosAnteriores);
      if (!usuario) {
        await client.query('ROLLBACK');
        return null;
      }

      await this.registrarAlteracaoUsuario(client, id, dadosAnteriores, usuario, comentario);

      await client.query('COMMIT');
      return usuario;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Monta o trecho dinâmico do UPDATE: colunas são nomes fixos (seguros) e os
  // valores entram parametrizados ($N), preservando a query parametrizada.
  private montarAtualizacaoUsuario(
    dados: AtualizarUsuarioDTO,
  ): { campos: string[]; valores: unknown[]; proximoIndice: number } {
    const colunas: Array<[string, unknown]> = [
      ['nome', dados.nome],
      ['email', dados.email],
      ['ativo', dados.ativo],
      ['perfil_acesso_id', dados.perfil_acesso_id],
    ];

    const campos: string[] = [];
    const valores: unknown[] = [];
    let contador = 1;

    for (const [coluna, valor] of colunas) {
      if (valor !== undefined) {
        campos.push(`${coluna} = $${contador++}`);
        valores.push(valor);
      }
    }

    return { campos, valores, proximoIndice: contador };
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
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

  async listarUsuarios(): Promise<UsuarioComPerfil[]> {
    console.log('[REPOSITORY] listarUsuarios');
    const result = await pool.query<UsuarioComPerfil>(
      `SELECT u.id, u.perfil_acesso_id, u.nome, u.email, u.senha_hash, u.ativo, u.criado_em,
              pa.nome AS perfil
         FROM usuarios u
         JOIN perfil_acesso pa ON pa.id = u.perfil_acesso_id
        ORDER BY u.nome`,
    );
    return result.rows;
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

  async criaUsuario(data: CriarUsuarioInput): Promise<UsuarioComPerfil> {
    const result = await pool.query<UsuarioComPerfil>(
      `INSERT INTO usuarios (perfil_acesso_id, nome, email, senha_hash, ativo)
       VALUES ($1, $2, LOWER($3), NULL, TRUE)
       RETURNING id, perfil_acesso_id, nome, email, senha_hash, ativo, criado_em`,
      [data.perfil_acesso_id, data.nome, data.email],
    );
    return result.rows[0];
  }

  async atualizaPerfilDeAcesso(id: string, role_id: string): Promise<UsuarioComPerfil | null> {
    console.log(`[REPOSITORY] atualizaPerfilDeAcesso usuario: ${id}, perfil: ${role_id}`);

    return this.executarComAuditoria(id, 'Perfil de acesso atualizado', async (client) => {
      const result = await client.query<UsuarioComPerfil>(
        `UPDATE usuarios
            SET perfil_acesso_id = $1
          WHERE id = $2
          RETURNING id, perfil_acesso_id, nome, email, senha_hash, ativo, criado_em`,
        [role_id, id],
      );
      return result.rows[0] ?? null;
    });
  }

  async atualizaUsuario(id: string, dados: AtualizarUsuarioDTO): Promise<UsuarioComPerfil | null> {
    console.log(`[REPOSITORY] atualizaUsuario: ${id}`);

    const { campos, valores, proximoIndice } = this.montarAtualizacaoUsuario(dados);
    valores.push(id);

    return this.executarComAuditoria(id, 'Dados de usuário atualizados', async (client) => {
      const result = await client.query<UsuarioComPerfil>(
        `UPDATE usuarios
            SET ${campos.join(', ')}
          WHERE id = $${proximoIndice}
          RETURNING id, perfil_acesso_id, nome, email, senha_hash, ativo, criado_em`,
        valores,
      );
      return result.rows[0] ?? null;
    });
  }

  async inativarUsuario(id: string): Promise<UsuarioComPerfil | null> {
    console.log(`[REPOSITORY] inativarUsuario: ${id}`);

    return this.executarComAuditoria(id, 'Usuário inativado', async (client) => {
      const result = await client.query<UsuarioComPerfil>(
        `UPDATE usuarios
            SET ativo = FALSE
          WHERE id = $1
          RETURNING id, perfil_acesso_id, nome, email, senha_hash, ativo, criado_em`,
        [id],
      );
      return result.rows[0] ?? null;
    });
  }

  async definirSenha(id: string, senhaHash: string): Promise<Usuario | null> {
    const result = await pool.query<Usuario>(
      `UPDATE usuarios
          SET senha_hash = $2
        WHERE id = $1
        RETURNING id, nome, email, senha_hash, ativo, perfil_acesso_id`,
      [id, senhaHash],
    );
    return result.rows[0] ?? null;
  }
}
