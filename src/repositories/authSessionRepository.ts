import pool from '../config/connection';
import { AuthSessao } from '../models/AuthSessao';

let tabelaGarantida = false;

async function garantirTabelaSessoes(): Promise<void> {
  if (tabelaGarantida) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_sessoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      ativa BOOLEAN NOT NULL DEFAULT TRUE,
      criada_em TIMESTAMP NOT NULL DEFAULT NOW(),
      expira_em TIMESTAMP NOT NULL,
      revogada_em TIMESTAMP,
      revogada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessoes_usuario ON auth_sessoes(usuario_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessoes_ativa ON auth_sessoes(ativa)`);

  tabelaGarantida = true;
}

export class AuthSessionRepository {
  async criarSessao(usuarioId: string, token: string, expiraEm: Date): Promise<AuthSessao> {
    await garantirTabelaSessoes();

    const { rows } = await pool.query<AuthSessao>(
      `INSERT INTO auth_sessoes (usuario_id, token, expira_em)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [usuarioId, token, expiraEm]
    );

    return rows[0];
  }

  async buscarSessao(id: string): Promise<AuthSessao | null> {
    await garantirTabelaSessoes();

    const { rows } = await pool.query<AuthSessao>(`SELECT * FROM auth_sessoes WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async encerrarSessao(id: string, revogadaPor?: string): Promise<AuthSessao | null> {
    await garantirTabelaSessoes();

    const { rows } = await pool.query<AuthSessao>(
      `UPDATE auth_sessoes
          SET ativa = FALSE,
              revogada_em = NOW(),
              revogada_por = $2
        WHERE id = $1
          AND ativa = TRUE
        RETURNING *`,
      [id, revogadaPor ?? null]
    );

    return rows[0] ?? null;
  }
}
