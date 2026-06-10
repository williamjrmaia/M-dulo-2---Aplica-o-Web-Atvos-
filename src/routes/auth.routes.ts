import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { PrimeiroAcessoController } from '../controllers/primeiroAcessoController';
import { requireAuth } from '../middlewares/requireAuth';
import { PrimeiroAcessoRepository } from '../repositories/primeiroAcessoRepository';
import { UserRepository } from '../repositories/userRepository';
import { AuthService } from '../services/authService';
import { PrimeiroAcessoService } from '../services/primeiroAcessoService';

const router = Router();

const repository = new UserRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);
const primeiroAcessoService = new PrimeiroAcessoService(repository, new PrimeiroAcessoRepository());
const primeiroAcessoController = new PrimeiroAcessoController(primeiroAcessoService);

router.get('/login', (req, res) => {
  res.render('login/index');
});

router.post('/login', controller.login);

router.post('/primeiro-acesso/solicitar', primeiroAcessoController.solicitarToken);

router.post('/primeiro-acesso/definir-senha', primeiroAcessoController.definirSenha);

router.post('/logout', requireAuth, controller.logout);

router.put('/auth/sessoes/:id', requireAuth, controller.encerrarSessao);

export default router;
