import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardInteracoesService';
import { ServiceUnavailableException, NoContentException } from '../errors/dashboardInteracoesErrors';

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  async getDashboardInteracoes(req: Request, res: Response): Promise<void> {
    console.log('[CONTROLLER] GET /dashboards/interacoes');

    try {
      const dto = await this.dashboardService.processarDashboardInteracoes();

      // 200 OK — JSON com métricas de engajamento e histórico
      res.status(200).json(dto);
    } catch (err) {
      if (err instanceof NoContentException) {
        // Nenhum registro encontrado
        res.status(404).json({ erro: err.message });
        return;
      }

      if (err instanceof ServiceUnavailableException) {
        // Dashboard indisponível — falha no servidor de dados
        res.status(503).json({ erro: err.message });
        return;
      }

      console.error('[CONTROLLER] Erro inesperado:', err);
      res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  }
}