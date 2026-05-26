import { Router } from 'express';
import interacaoRoutes from './interacao.routes';

const router = Router();
router.use(interacaoRoutes);

export default router;