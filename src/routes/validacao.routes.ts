import { Router } from 'express';
import {
  renderValidacao,
  renderRevisar,
  aprovarParceiroViaFormulario,
  devolverParceiroViaFormulario,
} from '../controllers/parceiroController';
import { authorizeRoles, requireAuth } from '../middlewares/requireAuth';

// ─── Views HTML: validação de registros (montado na raiz) ────────────────────
const router = Router();

router.use(requireAuth);
router.use(authorizeRoles('coordenador', 'administrador'));

router.get('/validacao', renderValidacao);
router.get('/validacao/:id', renderRevisar);
router.post('/validacao/:id/aprovar', aprovarParceiroViaFormulario);
router.post('/validacao/:id/devolver', devolverParceiroViaFormulario);

export default router;
