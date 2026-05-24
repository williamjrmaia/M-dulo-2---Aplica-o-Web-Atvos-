import { Router } from 'express';
import { createParceiro, editarParceiro } from '../controllers/parceiroController';

const router = Router();

router.post('/', createParceiro);
router.patch('/:id', editarParceiro);

export default router;
