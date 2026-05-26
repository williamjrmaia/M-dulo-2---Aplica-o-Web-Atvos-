import { Request, Response } from 'express';
import { InteracaoService } from '../services/interacaoService';

export class InteracaoController {
  constructor(private readonly interacaoService: InteracaoService) {}

  registrar = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { registrado_por, tipo, descricao, data } = req.body;

    // Validação de payload
    if (!registrado_por || !tipo || !descricao || !data) {
      return res.status(400).json({ error: 'Dados de interação inválidos' });
    }

    console.log(`[CONTROLLER] Registro de interação para parceiro: ${id}`);

    try {
      const interacao = await this.interacaoService.registrarInteracao(id, {
        registrado_por,
        tipo,
        descricao,
        data,
      });
      console.log('[CONTROLLER] Retornando 201');
      return res.status(201).json(interacao);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';

      if (message === 'Parceiro não localizado para registro') {
        return res.status(404).json({ error: message });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}