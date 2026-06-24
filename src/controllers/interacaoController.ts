import { Request, Response } from 'express';
import { criarInteracaoSchema } from '../schemas/interacao.schema';
import { InteracaoService } from '../services/interacaoService';

function extrairIdParam(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function responderErroRegistro(res: Response, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';

  if (message === 'Parceiro não localizado para registro') {
    return res.status(404).json({ error: message });
  }
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

export class InteracaoController {
  constructor(private readonly interacaoService: InteracaoService) {}

  registrar = async (req: Request, res: Response) => {
    const id = extrairIdParam(req);
    const parsed = criarInteracaoSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados de interação inválidos' });
    }
    const { registrado_por, tipo, descricao, data } = parsed.data;

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
      return responderErroRegistro(res, error);
    }
  };
}
