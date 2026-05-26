import { Router } from 'express';
import { renderListaParceiros } from '../controllers/parceiroViewController';

const router = Router();

router.get('/', renderListaParceiros);

export default router;
