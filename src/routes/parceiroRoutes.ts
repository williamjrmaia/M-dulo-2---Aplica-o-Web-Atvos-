import { Router } from 'express';
import { createParceiro, editarParceiro, listarParceiros } from '../controllers/parceiroController';

const router = Router();

router.post('/', createParceiro);
router.patch('/:id', editarParceiro);
router.get('/', listarParceiros);

export default router;
