import pool from '../config/connection';
import { InteracoesListEntity } from '../models/dashboardInteracoes.model';
import { DataAccessException } from '../errors/dashboardInteracoesErrors';

export class DashboardRepository {
  async buscarEstatisticasInteracoes(): Promise<InteracoesListEntity[]> {
    try {
      const result = await pool.query<InteracoesListEntity>(`
        SELECT
          tipo AS tipo_interacao,
          status,
          COUNT(*) AS total
        FROM interacao
        GROUP BY tipo, status
        ORDER BY total DESC
      `);

      return result.rows;
    } catch (err) {
      throw new DataAccessException();
    }
  }
}