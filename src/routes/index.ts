import { Router } from 'express';
import interacaoRoutes from './interacao.routes';
import exportaRoutes from './exporta.routes';

const router = Router();

router.use(interacaoRoutes);
router.use(exportaRoutes);

export default router;