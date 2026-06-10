import { Router } from 'express';
import {
  createTerra,
  listarParceirosDaTerra,
  listarTerras,
  updateTerra,
  vincularParceiroATerra,
} from '../controllers/terraController';
import { authorizeRoles, requireAuth } from '../middlewares/requireAuth';

// ─── API JSON (montado em /api/terras) ───────────────────────────────────────
export const apiRouter = Router();

apiRouter.use(requireAuth);
apiRouter.post('/', authorizeRoles('analista', 'administrador'), createTerra);
apiRouter.get('/', authorizeRoles('analista', 'coordenador', 'administrador'), listarTerras);
apiRouter.get('/:id/parceiros', authorizeRoles('analista', 'coordenador', 'administrador'), listarParceirosDaTerra);
apiRouter.post('/:id/parceiros', authorizeRoles('analista', 'administrador'), vincularParceiroATerra);
apiRouter.put('/:id', authorizeRoles('analista', 'administrador'), updateTerra);
