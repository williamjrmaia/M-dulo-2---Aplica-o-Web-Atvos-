import { Router } from 'express';
import interacaoRoutes from './interacao.routes';
import userRoutes from './user.routes';
import exportaRoutes from './exporta.routes';

const router = Router();
router.use(userRoutes);

router.use(interacaoRoutes);
router.use(exportaRoutes);

export default router;