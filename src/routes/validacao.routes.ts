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

const somenteValidadores = [requireAuth, authorizeRoles('coordenador', 'administrador')];

router.get('/validacao', ...somenteValidadores, renderValidacao);
router.get('/validacao/:id', ...somenteValidadores, renderRevisar);
router.post('/validacao/:id/aprovar', ...somenteValidadores, aprovarParceiroViaFormulario);
router.post('/validacao/:id/devolver', ...somenteValidadores, devolverParceiroViaFormulario);

export default router;
