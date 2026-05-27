import { Router } from 'express';
import interacaoRoutes from './interacao.routes';
import userRoutes from './user.routes';

const router = Router();

export default router;

router.use(userRoutes);
router.use(interacaoRoutes);