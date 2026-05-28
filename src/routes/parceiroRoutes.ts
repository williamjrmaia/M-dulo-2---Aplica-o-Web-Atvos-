import { Router } from 'express';
import {
  createParceiro,
  editarParceiro,
  listarParceiros,
  obterParceiroPorId,
  renderFormCadastro,
  processarCadastro,
  renderDetalheParceiro,
  renderFormEdicao,
  processarEdicao,
} from '../controllers/parceiroController';

// ─── API JSON (montado em /api/parceiros) ────────────────────────────────────
export const apiRouter = Router();

apiRouter.post('/', createParceiro);
apiRouter.patch('/:id', editarParceiro);
apiRouter.get('/', listarParceiros);
apiRouter.get('/:id', obterParceiroPorId);

// ─── Views HTML (montado em /parceiros) ──────────────────────────────────────
export const viewRouter = Router();

viewRouter.get('/novo', renderFormCadastro);
viewRouter.post('/', processarCadastro);
viewRouter.get('/:id/editar', renderFormEdicao);
viewRouter.post('/:id/editar', processarEdicao);
viewRouter.get('/:id', renderDetalheParceiro);
