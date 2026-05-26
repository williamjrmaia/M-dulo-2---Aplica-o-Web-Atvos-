import { Router } from 'express';
import {
  createParceiro,
  renderFormCadastro,
  processarCadastro,
} from '../controllers/parceiroController';

// ─── API JSON (montado em /api/parceiros) ────────────────────────────────────
export const apiRouter = Router();

apiRouter.post('/', createParceiro);

// ─── Views HTML (montado em /parceiros) ──────────────────────────────────────
export const viewRouter = Router();

viewRouter.get('/novo', renderFormCadastro);
viewRouter.post('/', processarCadastro);
