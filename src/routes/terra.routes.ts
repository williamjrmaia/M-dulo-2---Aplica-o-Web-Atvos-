import { Router } from 'express';
import {
  createTerra,
  listarParceirosDaTerra,
  listarTerras,
  updateTerra,
  vincularParceiroATerra,
} from '../controllers/terraController';
import { requireAuth } from '../middlewares/requireAuth';

// ─── API JSON (montado em /api/terras) ───────────────────────────────────────
export const apiRouter = Router();

apiRouter.use(requireAuth);
apiRouter.post('/', createTerra);
apiRouter.get('/', listarTerras);
apiRouter.get('/:id/parceiros', listarParceirosDaTerra);
apiRouter.post('/:id/parceiros', vincularParceiroATerra);
apiRouter.put('/:id', updateTerra);
