import { Request, Response } from 'express';
import { ExportaService } from '../services/exportaService';
import { EmptyDataException, DataAccessException, InternalError } from '../errors/exportaErrors';

export class ExportaController {
  constructor(private readonly exportaService: ExportaService) {}

  async exportarParceiros(req: Request, res: Response): Promise<void> {
    try {
      const buffer = await this.exportaService.processarExportacaoParceiros();

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="dados_parceiros_ativos.csv"');
      res.status(200).send(buffer);
    } catch (err) {
      if (err instanceof EmptyDataException) {
        res.status(404).json({ erro: err.message });
        return;
      }

      if (err instanceof DataAccessException) {
        res.status(500).json({ erro: 'Falha na geração do arquivo' });
        return;
      }

      if (err instanceof InternalError) {
        res.status(500).json({ erro: err.message });
        return;
      }

      res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  }
}