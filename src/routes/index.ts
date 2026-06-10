import { Router } from 'express';
import homeRoutes from './home.routes';
import authRoutes from './auth.routes';
import interacaoRoutes from './interacao.routes';
import userRoutes from './user.routes';
import exportaRoutes from './exporta.routes';
import dashboardRoutes from './dashboardInteracoes.routes';
import validacaoRoutes from './validacao.routes';

const router = Router();
router.use(homeRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(interacaoRoutes);
router.use(exportaRoutes);
router.use(dashboardRoutes);
router.use(validacaoRoutes);

export default router;