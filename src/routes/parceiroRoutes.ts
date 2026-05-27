import { Router } from 'express';
import {
  createParceiro,
  editarParceiro,
  listarParceiros,
  renderFormCadastro,
  processarCadastro,
  renderListaParceiros,
} from '../controllers/parceiroController';

// ─── API JSON (montado em /api/parceiros) ────────────────────────────────────
export const apiRouter = Router();

apiRouter.post('/', createParceiro);
apiRouter.patch('/:id', editarParceiro);
apiRouter.get('/', listarParceiros);

// ─── Views HTML (montado em /parceiros) ──────────────────────────────────────
export const viewRouter = Router();

viewRouter.get('/novo', renderFormCadastro);
viewRouter.post('/', processarCadastro);
viewRouter.get('/', renderListaParceiros);
