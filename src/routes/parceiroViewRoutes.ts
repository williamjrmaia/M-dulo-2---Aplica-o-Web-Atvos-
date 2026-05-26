import { Router } from 'express';
import { renderDetalheParceiro } from '../controllers/parceiroViewController';

const router = Router();

router.get('/:id', renderDetalheParceiro);

export default router;
