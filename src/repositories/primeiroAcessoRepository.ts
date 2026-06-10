import pool from '../config/connection';
import { PrimeiroAcessoToken } from '../models/PrimeiroAcessoToken';

export class PrimeiroAcessoRepository {
  async criarToken(usuarioId: string, tokenHash: string, expiraEm: Date): Promise<PrimeiroAcessoToken> {
    const { rows } = await pool.query<PrimeiroAcessoToken>(
      `INSERT INTO primeiro_acesso_tokens (usuario_id, token_hash, expira_em)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [usuarioId, tokenHash, expiraEm]
    );

    return rows[0];
  }

  async invalidarTokensPendentes(usuarioId: string): Promise<void> {
    await pool.query(
      `UPDATE primeiro_acesso_tokens
          SET usado_em = NOW()
        WHERE usuario_id = $1
          AND usado_em IS NULL`,
      [usuarioId]
    );
  }

  async buscarTokenValido(tokenHash: string): Promise<PrimeiroAcessoToken | null> {
    const { rows } = await pool.query<PrimeiroAcessoToken>(
      `SELECT *
         FROM primeiro_acesso_tokens
        WHERE token_hash = $1
          AND usado_em IS NULL
          AND expira_em > NOW()
        LIMIT 1`,
      [tokenHash]
    );

    return rows[0] ?? null;
  }

  async marcarComoUsado(id: string): Promise<void> {
    await pool.query(
      `UPDATE primeiro_acesso_tokens
          SET usado_em = NOW()
        WHERE id = $1
          AND usado_em IS NULL`,
      [id]
    );
  }
}
