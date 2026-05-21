import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { UserRepository } from '../repositories/userRepository';
import { AuthService } from '../services/authService';

const router = Router();

const repository = new UserRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

router.post('/login', (req, res) => {
  console.log(`[ROUTE] POST /login recebida para: ${req.body?.email}`);
  return controller.login(req, res);
});

export default router;