import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.render('home/index', { active: 'home' });
});

export default router;
