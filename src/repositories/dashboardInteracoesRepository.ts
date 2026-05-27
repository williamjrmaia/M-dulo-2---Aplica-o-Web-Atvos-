import pool from '../config/connection';
import { InteracoesListEntity } from '../models/dashboardInteracoes.model';
import { DataAccessException } from '../errors/dashboardInteracoesErrors';

export class DashboardRepository {
  async buscarEstatisticasInteracoes(): Promise<InteracoesListEntity[]> {
    console.log('[REPOSITORY] buscarEstatisticasInteracoes');

    try {
      const result = await pool.query<InteracoesListEntity>(`
        SELECT
          tipo AS tipo_interacao,
          'registrado' AS status,
          COUNT(*) AS total
        FROM interacao
        GROUP BY tipo
        ORDER BY total DESC
      `);

      return result.rows;
    } catch (err) {
      console.error('[REPOSITORY] Erro na consulta:', err);
      throw new DataAccessException();
    }
  }
}