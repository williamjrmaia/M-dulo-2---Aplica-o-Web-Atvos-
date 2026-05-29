import { Router } from 'express';
import { createTerra, listarTerras } from '../controllers/terraController';

// ─── API JSON (montado em /api/terras) ───────────────────────────────────────
export const apiRouter = Router();

apiRouter.post('/', createTerra);
apiRouter.get('/', listarTerras);
