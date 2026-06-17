import { ExportaRepository } from '../repositories/exportaRepository';
import { ParceiroExportacao } from '../models/parceiro.model';
import { EmptyDataException, DataAccessException, InternalError } from '../errors/exportaErrors';

export class ExportaService {
  constructor(private readonly exportaRepository: ExportaRepository) {}

  async processarExportacaoParceiros(): Promise<Buffer> {
    const parceiros = await this.buscarDadosParaExportacao();

    if (!parceiros || parceiros.length === 0) {
      throw new EmptyDataException();
    }

    // RN03 — converter para formato de exportação (CSV/XLSX)
    try {
      return this.converterParaFormatoExportacao(parceiros);
    } catch {
      throw new InternalError();
    }
  }

  private async buscarDadosParaExportacao(): Promise<ParceiroExportacao[]> {
    try {
      return await this.exportaRepository.buscarTodosDadosParceiros();
    } catch (err) {
      if (err instanceof DataAccessException) throw err;
      throw new DataAccessException();
    }
  }

  private campoPrecisaAspas(str: string): boolean {
    return str.includes(',') || str.includes('"') || str.includes('\n');
  }

  private escaparCampoCSV(valor: string | null | undefined): string {
    const str = String(valor ?? '');
    if (this.campoPrecisaAspas(str)) {
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
