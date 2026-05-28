import { Router } from 'express';
import authRoutes from './auth.routes';
import interacaoRoutes from './interacao.routes';
import userRoutes from './user.routes';
import exportaRoutes from './exporta.routes';

const router = Router();
router.use(authRoutes);
router.use(userRoutes);
router.use(interacaoRoutes);
router.use(exportaRoutes);

export default router;