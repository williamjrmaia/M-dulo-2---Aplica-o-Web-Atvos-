import { Router } from 'express';
import {
  createTerra,
  listarParceirosDaTerra,
  listarTerras,
  updateTerra,
  vincularParceiroATerra,
} from '../controllers/terraController';

// ─── API JSON (montado em /api/terras) ───────────────────────────────────────
export const apiRouter = Router();

apiRouter.post('/', createTerra);
apiRouter.get('/', listarTerras);
apiRouter.get('/:id/parceiros', listarParceirosDaTerra);
apiRouter.post('/:id/parceiros', vincularParceiroATerra);
apiRouter.put('/:id', updateTerra);
