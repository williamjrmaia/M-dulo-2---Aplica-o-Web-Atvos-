import { DashboardService } from '../services/dashboardInteracoesService';
import { DashboardRepository } from '../repositories/dashboardInteracoesRepository';
import { InteracoesListEntity } from '../models/dashboardInteracoes.model';
import {
  DataAccessException,
  ServiceUnavailableException,
  NoContentException,
} from '../errors/dashboardInteracoesErrors';

// Stub do repositório: isola o service do banco para um teste unitário puro.
function repoStub(impl: () => Promise<InteracoesListEntity[]>): DashboardRepository {
  return { buscarEstatisticasInteracoes: impl } as unknown as DashboardRepository;
}

const estatisticas: InteracoesListEntity[] = [
  { tipo_interacao: 'ligacao', status: 'concluida', total: 10 },
  { tipo_interacao: 'email', status: 'pendente', total: 6 },
];

describe('DashboardService.processarDashboardInteracoes (unitário, com stub)', () => {
  // CT01 → RN11 (RF006): calcula os KPIs de engajamento a partir das estatísticas
  it('calcula total, agrupamentos e KPI de engajamento a partir dos dados', async () => {
    const service = new DashboardService(repoStub(async () => estatisticas));

    const dto = await service.processarDashboardInteracoes();

    expect(dto.total_interacoes).toBe(16);
    expect(dto.kpi_engajamento).toBe(8); // round(16 / 2 tipos)
    expect(dto.por_tipo).toHaveLength(2);
    expect(dto.por_status).toHaveLength(2);
    expect(dto.por_tipo).toContainEqual({ tipo: 'ligacao', total: 10 });
  });

  // CT02 → RN11 (RF006): sem estatísticas, lança NoContentException
  it('lança NoContentException quando não há estatísticas de interações', async () => {
    const service = new DashboardService(repoStub(async () => []));

    await expect(service.processarDashboardInteracoes()).rejects.toBeInstanceOf(NoContentException);
  });

  // CT03 → RN11 (RF006): falha de acesso a dados vira indisponibilidade do serviço
  it('converte DataAccessException em ServiceUnavailableException', async () => {
    const service = new DashboardService(
      repoStub(async () => {
        throw new DataAccessException();
      })
    );

    await expect(service.processarDashboardInteracoes()).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  // CT04 → RN11 (RF006): erro genérico também vira indisponibilidade do serviço
  it('converte um erro genérico em ServiceUnavailableException', async () => {
    const service = new DashboardService(
      repoStub(async () => {
        throw new Error('timeout no banco');
      })
    );

    await expect(service.processarDashboardInteracoes()).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  // CT05 → RN11 (RF006): branch defensivo do KPI — sem tipos de interação, engajamento é zero.
  // Inalcançável pelo fluxo público (lista vazia lança NoContentException antes); teste
  // white-box chama o método privado direto para cobrir o ramo.
  it('retorna KPI de engajamento zero quando não há tipos de interação', () => {
    const service = new DashboardService(repoStub(async () => estatisticas));

    const dto = (service as unknown as {
      calcularKPIEngajamento(dados: InteracoesListEntity[]): { kpi_engajamento: number };
    }).calcularKPIEngajamento([]);

    expect(dto.kpi_engajamento).toBe(0);
  });
});
