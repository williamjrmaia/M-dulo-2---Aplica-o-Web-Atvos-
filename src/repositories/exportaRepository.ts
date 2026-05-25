import pool from '../config/connection';
import { DataAccessException } from '../errors/exportaErrors';

export interface ParceiroExportacao {
  id: string;
  nome: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  email: string | null;
  status: string;
  criado_em: Date;
}

export class ExportaRepository {
  async buscarTodosDadosParceiros(): Promise<ParceiroExportacao[]> {
    console.log('[REPOSITORY] buscarTodosDadosParceiros');

    try {
      const result = await pool.query<ParceiroExportacao>(`
        SELECT
          p.id,
          p.nome,
          p.tipo_pessoa,
          p.cpf_cnpj,
          p.email,
          p.status,
          p.criado_em
        FROM parceiros p
        ORDER BY p.criado_em DESC
      `);

      return result.rows;
    } catch (err) {
      console.error('[REPOSITORY] Erro na consulta:', err);
      throw new DataAccessException();
    }
  }
}