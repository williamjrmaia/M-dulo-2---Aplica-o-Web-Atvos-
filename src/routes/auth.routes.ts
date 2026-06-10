import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middlewares/requireAuth';
import { UserRepository } from '../repositories/userRepository';
import { AuthService } from '../services/authService';

const router = Router();

const repository = new UserRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

router.get('/login', (req, res) => {
  res.render('login/index');
});

router.post('/login', controller.login);

router.post('/logout', requireAuth, controller.logout);

router.put('/auth/sessoes/:id', requireAuth, controller.encerrarSessao);

export default router;
