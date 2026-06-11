import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth';

const router = Router();

router.get('/', requireAuth, (_req, res) => {
  res.render('home/index', { active: 'home' });
});

export default router;
