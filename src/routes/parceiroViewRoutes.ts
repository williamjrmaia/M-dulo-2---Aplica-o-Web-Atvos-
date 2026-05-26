import { Router } from 'express';
import { renderFormCadastro, processarCadastro } from '../controllers/parceiroViewController';

const router = Router();

router.get('/novo', renderFormCadastro);
router.post('/', processarCadastro);

export default router;
