/* ============================================================================
 * REVISÃO DO PROFESSOR — Semana 8 (Afonso) — COMENTÁRIO DE REVISÃO, NÃO ALTERA O CÓDIGO
 * GET /login renderiza a view (bom), mas o POST /login cai num controller que
 * responde JSON (ver authController) — então o formulário web não fecha o ciclo
 * de sessão. Para a entrega de sexta, o POST do form precisa: criar a sessão,
 * setar cookie HttpOnly e redirecionar. Falta também a rota de LOGOUT acessível
 * pela navegação (existe PUT /auth/sessoes/:id de API, mas não um logout do front).
 * ========================================================================== */
import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { UserRepository } from '../repositories/userRepository';
import { AuthService } from '../services/authService';

const router = Router();

const repository = new UserRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

router.get('/login', (req, res) => {
  res.render('login/index');
});

router.post('/login', (req, res) => {
  console.log(`[ROUTE] POST /login recebida para: ${req.body?.email}`);
  return controller.login(req, res);
});

router.put('/auth/sessoes/:id', (req, res) => {
  console.log(`[ROUTE] PUT /auth/sessoes/${req.params.id} recebida`);
  return controller.encerrarSessao(req, res);
});

export default router;
