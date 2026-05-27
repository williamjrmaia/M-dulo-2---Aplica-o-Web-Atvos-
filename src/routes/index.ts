import { Router } from 'express';
import interacaoRoutes from './interacao.routes';
import userRoutes from './user.routes';
const router = Router();
router.use(userRoutes);
router.use(interacaoRoutes);
export default router;