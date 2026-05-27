import { Router } from 'express';
import interacaoRoutes from './interacao.routes';
import exportaRoutes from './exporta.routes';
import dashboardRoutes from './dashboardInteracoes.routes';

const router = Router();

router.use(interacaoRoutes);
router.use(exportaRoutes);
router.use(dashboardRoutes);

export default router;