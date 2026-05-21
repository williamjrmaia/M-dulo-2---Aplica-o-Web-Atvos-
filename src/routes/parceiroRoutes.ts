import { Router } from 'express';
import { createParceiro } from '../controllers/parceiroController';

const router = Router();

router.post('/', createParceiro);

export default router;
