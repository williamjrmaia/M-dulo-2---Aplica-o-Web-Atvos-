import { Router } from 'express';
import { createParceiro, editarParceiro, listarParceiros, obterParceiroPorId } from '../controllers/parceiroController';

const router = Router();

router.post('/', createParceiro);
router.patch('/:id', editarParceiro);
router.get('/', listarParceiros);
router.get('/:id', obterParceiroPorId);

export default router;
