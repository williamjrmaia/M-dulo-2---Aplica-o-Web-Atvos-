import { ExportaRepository } from '../repositories/exportaRepository';
import { ParceiroExportacao } from '../models/parceiro.model';
import { EmptyDataException, DataAccessException, InternalError } from '../errors/exportaErrors';

export class ExportaService {
  constructor(private readonly exportaRepository: ExportaRepository) {}

  async processarExportacaoParceiros(): Promise<Buffer> {
    let parceiros: ParceiroExportacao[];
    try {
      parceiros = await this.exportaRepository.buscarTodosDadosParceiros();
    } catch (err) {
      if (err instanceof DataAccessException) throw err;
      throw new DataAccessException();
    }

    if (!parceiros || parceiros.length === 0) {
      throw new EmptyDataException();
    }

    // RN03 — converter para formato de exportação (CSV/XLSX)
    try {
      const buffer = this.converterParaFormatoExportacao(parceiros);
      return buffer;
    } catch (err) {
      throw new InternalError();
    }
  }

  private escaparCampoCSV(valor: string | null | undefined): string {
    if (valor === null || valor === undefined) return '';
    const str = String(valor);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private converterParaFormatoExportacao(parceiros: ParceiroExportacao[]): Buffer {
    const cabecalho = 'id,nome,tipo_pessoa,cpf_cnpj,email,status,criado_em';
    const linhas = parceiros.map((p) =>
      [
        p.id,
        this.escaparCampoCSV(p.nome),
        this.escaparCampoCSV(p.tipo_pessoa),
        this.escaparCampoCSV(p.cpf_cnpj),
        this.escaparCampoCSV(p.email),
        this.escaparCampoCSV(p.status),
        p.criado_em,
      ].join(',')
    );
    const csv = [cabecalho, ...linhas].join('\n');
    return Buffer.from(csv, 'utf-8');
  }
}