import { Router } from 'express';
import { InteracaoController } from '../controllers/interacaoController';
import { InteracaoRepository } from '../repositories/interacaoRepository';
import { InteracaoService } from '../services/interacaoService';

const router = Router();

const repository = new InteracaoRepository();
const service = new InteracaoService(repository);
const controller = new InteracaoController(service);

router.post('/parceiros/:id/interacoes', (req, res) => {
  console.log(`[ROUTE] POST /parceiros/${req.params.id}/interacoes recebida`);
  return controller.registrar(req, res);
});

export default router;