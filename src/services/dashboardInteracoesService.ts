import { DashboardRepository } from '../repositories/dashboardInteracoesRepository';
import { InteracoesListEntity, DashboardInteracoesDTO } from '../models/dashboardInteracoes.model';
import { DataAccessException, ServiceUnavailableException, NoContentException } from '../errors/dashboardInteracoesErrors';

export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async processarDashboardInteracoes(): Promise<DashboardInteracoesDTO> {
    console.log('[SERVICE] processarDashboardInteracoes');

    // RN01 — buscar dados do banco
    let dados: InteracoesListEntity[];
    try {
      dados = await this.dashboardRepository.buscarEstatisticasInteracoes();
    } catch (err) {
      if (err instanceof DataAccessException) {
        throw new ServiceUnavailableException();
      }
      throw new ServiceUnavailableException();
    }

    // RN02 — nenhum registro encontrado
    if (!dados || dados.length === 0) {
      throw new NoContentException();
    }

    // RN03 — Lógica de Business Intelligence: calcular KPIs
    console.log('[SERVICE] Calculando KPI de engajamento...');
    const dto = this.calcularKPIEngajamento(dados);
    console.log('[SERVICE] Dashboard processado com sucesso');
    return dto;
  }

  private calcularKPIEngajamento(dados: InteracoesListEntity[]): DashboardInteracoesDTO {
    const total_interacoes = dados.reduce((acc, d) => acc + Number(d.total), 0);

    const por_tipo = dados.map((d) => ({
      tipo: d.tipo_interacao,
      total: Number(d.total),
    }));

    const por_status = dados.map((d) => ({
      status: d.status,
      total: Number(d.total),
    }));

    // KPI de engajamento: média de interações por tipo
    const kpi_engajamento = por_tipo.length > 0
      ? Math.round(total_interacoes / por_tipo.length)
      : 0;

    return {
      total_interacoes,
      por_tipo,
      por_status,
      kpi_engajamento,
    };
  }
}