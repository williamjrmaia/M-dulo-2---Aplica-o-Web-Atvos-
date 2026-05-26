import { Router } from 'express';
import {
  createParceiro,
  editarParceiro,
  renderFormEdicao,
  processarEdicao,
} from '../controllers/parceiroController';

// ─── API JSON (montado em /api/parceiros) ────────────────────────────────────
export const apiRouter = Router();

apiRouter.post('/', createParceiro);
apiRouter.patch('/:id', editarParceiro);

// ─── Views HTML (montado em /parceiros) ──────────────────────────────────────
export const viewRouter = Router();

viewRouter.get('/:id/editar', renderFormEdicao);
viewRouter.post('/:id/editar', processarEdicao);
