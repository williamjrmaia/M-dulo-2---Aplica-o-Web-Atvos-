import pool from '../config/connection';
import { ParceiroExportacao } from '../models/parceiro.model';
import { DataAccessException } from '../errors/exportaErrors';

export { ParceiroExportacao };

export class ExportaRepository {
  async buscarTodosDadosParceiros(): Promise<ParceiroExportacao[]> {
    try {
      const result = await pool.query<ParceiroExportacao>(`
        SELECT
          p.nome,
          p.nome_acompanhante AS contato,
          COALESCE(
            (
              SELECT vc.tipo_parceiro
                FROM vinculo_comercial vc
               WHERE vc.parceiro_id = p.id
                 AND vc.status != 'inativo'
               ORDER BY vc.id DESC
               LIMIT 1
            ),
            p.tipo_pessoa
          ) AS tipo_parceiro,
          p.regiao,
          (
            SELECT tp.numero
              FROM telefone_parceiro tp
             WHERE tp.parceiro_id = p.id
               AND tp.principal = TRUE
               AND tp.ativo = TRUE
             ORDER BY tp.criado_em DESC
             LIMIT 1
          ) AS telefone_principal,
          p.email,
          COALESCE(
            (
              SELECT string_agg(terras.nome, '; ' ORDER BY terras.nome)
                FROM (
                  SELECT DISTINCT t.nome
                    FROM parceiro_terra pt
                    JOIN terras t ON t.id = pt.terra_id
                   WHERE pt.parceiro_id = p.id
                     AND t.status != 'inativo'
                  UNION
                  SELECT DISTINCT t.nome
                    FROM vinculo_comercial vc
                    JOIN terras t ON t.id = vc.terra_id
                   WHERE vc.parceiro_id = p.id
                     AND vc.status != 'inativo'
                     AND t.status != 'inativo'
                ) terras
            ),
            p.usina_referencia
          ) AS terra_unidade
        FROM parceiros p
        WHERE p.status = 'ativo'
        ORDER BY p.criado_em DESC
      `);

      return result.rows;
    } catch {
      throw new DataAccessException();
    }
  }
}
