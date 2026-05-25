import { ExportaRepository, ParceiroExportacao } from '../repositories/exportaRepository';
import { EmptyDataException, DataAccessException, InternalError } from '../errors/exportaErrors';

export class ExportaService {
  constructor(private readonly exportaRepository: ExportaRepository) {}

  async processarExportacaoParceiros(): Promise<Buffer> {
    console.log('[SERVICE] processarExportacaoParceiros');

    // RN01 — buscar dados do banco (pode lançar DataAccessException)
    let parceiros: ParceiroExportacao[];
    try {
      parceiros = await this.exportaRepository.buscarTodosDadosParceiros();
    } catch (err) {
      if (err instanceof DataAccessException) throw err;
      throw new DataAccessException();
    }

    // RN02 — lista vazia
    if (!parceiros || parceiros.length === 0) {
      throw new EmptyDataException();
    }

    // RN03 — converter para formato de exportação (CSV/XLSX)
    try {
      console.log('[SERVICE] converterParaFormatoExportacao...');
      const buffer = this.converterParaFormatoExportacao(parceiros);
      console.log('[SERVICE] Exportação concluída');
      return buffer;
    } catch (err) {
      console.error('[SERVICE] Falha na geração do arquivo:', err);
      throw new InternalError();
    }
  }

  private converterParaFormatoExportacao(parceiros: ParceiroExportacao[]): Buffer {
    const cabecalho = 'id,nome,tipo_pessoa,cpf_cnpj,email,status,criado_em';
    const linhas = parceiros.map((p) =>
      [
        p.id,
        `"${p.nome}"`,
        p.tipo_pessoa,
        p.cpf_cnpj,
        p.email ?? '',
        `"${p.status}"`,
        p.criado_em,
      ].join(',')
    );
    const csv = [cabecalho, ...linhas].join('\n');
    return Buffer.from(csv, 'utf-8');
  }
}