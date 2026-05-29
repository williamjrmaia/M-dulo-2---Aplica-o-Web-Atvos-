import { Router } from 'express';
import { createTerra, updateTerra } from '../controllers/terraController';

// ─── API JSON (montado em /api/terras) ───────────────────────────────────────
export const apiRouter = Router();

apiRouter.post('/', createTerra);
apiRouter.put('/:id', updateTerra);
