import { Router } from 'express';
import { renderFormEdicao, processarEdicao } from '../controllers/parceiroViewController';

const router = Router();

router.get('/:id/editar', renderFormEdicao);
router.post('/:id/editar', processarEdicao);

export default router;
