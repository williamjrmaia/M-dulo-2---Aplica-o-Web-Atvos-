import pool from '../config/connection';

export interface Interacao {
  id: string;
  parceiro_id: string;
  registrado_por: string;
  tipo: string;
  descricao: string;
  data: string;
  criado_em?: Date;
}

export interface CriarInteracaoDTO {
  registrado_por: string;
  tipo: string;
  descricao: string;
  data: string;
}

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
}