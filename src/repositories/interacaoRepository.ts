import pool from '../config/connection';
import { Interacao, CriarInteracaoDTO } from '../models/interacao.model';

export { Interacao, CriarInteracaoDTO };

export class InteracaoRepository {
  async verificarExistenciaParceiro(parceiro_id: string): Promise<boolean> {
    console.log(`[REPOSITORY] verificarExistenciaParceiro: ${parceiro_id}`);
    const result = await pool.query(
      'SELECT id FROM parceiros WHERE id = $1',
      [parceiro_id]
    );
    return result.rows.length > 0;
  }

  async salvar(parceiro_id: string, dados: CriarInteracaoDTO): Promise<Interacao> {
    console.log(`[REPOSITORY] salvar interacao para parceiro: ${parceiro_id}`);
    const result = await pool.query<Interacao>(
      `INSERT INTO interacao (parceiro_id, registrado_por, tipo, descricao, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [parceiro_id, dados.registrado_por, dados.tipo, dados.descricao, dados.data]
    );
    return result.rows[0];
  }

  async listarPorParceiro(parceiro_id: string): Promise<Interacao[]> {
    console.log(`[REPOSITORY] listar interacoes para parceiro: ${parceiro_id}`);
    const result = await pool.query<Interacao>(
      `SELECT *
         FROM interacao
        WHERE parceiro_id = $1
        ORDER BY data DESC, criado_em DESC`,
      [parceiro_id]
    );
    return result.rows;
  }
}
