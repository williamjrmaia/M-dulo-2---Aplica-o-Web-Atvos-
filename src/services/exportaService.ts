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
    } catch {
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
    const cabecalho = 'nome,contato,tipo_parceiro,regiao,telefone_principal,email,terra_unidade';
    const linhas = parceiros.map((p) =>
      [
        this.escaparCampoCSV(p.nome),
        this.escaparCampoCSV(p.contato),
        this.escaparCampoCSV(p.tipo_parceiro),
        this.escaparCampoCSV(p.regiao),
        this.escaparCampoCSV(p.telefone_principal),
        this.escaparCampoCSV(p.email),
        this.escaparCampoCSV(p.terra_unidade),
      ].join(',')
    );
    const csv = [cabecalho, ...linhas].join('\n');
    return Buffer.from(csv, 'utf-8');
  }
}
