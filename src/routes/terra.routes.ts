import { Router } from 'express';
import { createTerra, listarTerras, updateTerra } from '../controllers/terraController';

// ─── API JSON (montado em /api/terras) ───────────────────────────────────────
export const apiRouter = Router();

apiRouter.post('/', createTerra);
apiRouter.get('/', listarTerras);
apiRouter.put('/:id', updateTerra);
