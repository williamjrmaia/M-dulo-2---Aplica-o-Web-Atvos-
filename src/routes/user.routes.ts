import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authorizeRoles, requireAuth } from '../middlewares/requireAuth';
import { UserRepository } from '../repositories/userRepository';
import { UserService } from '../services/userService';

const router = Router();

const repository = new UserRepository();
const service = new UserService(repository);
const controller = new UserController(service);

router.use(requireAuth);
router.use(authorizeRoles('administrador'));

router.post('/api/usuarios', (req, res) => {
  console.log('[ROUTE] POST /api/usuarios recebida');
  return controller.criaUsuario(req, res);
});

// ─── Views HTML: gestão e cadastro de usuários ───────────────────────────────
router.get('/usuarios', (req, res) => {
  console.log('[ROUTE] GET /usuarios recebida');
  return controller.listarUsuariosView(req, res);
});

router.get('/usuarios/novo', (req, res) => {
  console.log('[ROUTE] GET /usuarios/novo recebida');
  return controller.novoUsuarioView(req, res);
});

router.post('/usuarios', (req, res) => {
  console.log('[ROUTE] POST /usuarios (formulario) recebida');
  return controller.criarUsuarioViaFormulario(req, res);
});

router.get('/usuarios/:id/editar', (req, res) => {
  console.log(`[ROUTE] GET /usuarios/${req.params.id}/editar recebida`);
  return controller.editarUsuario(req, res);
});

router.put('/usuarios/:id', (req, res) => {
  console.log(`[ROUTE] PUT /usuarios/${req.params.id} recebida`);
  return controller.atualizaUsuario(req, res);
});

router.post('/usuarios/:id', (req, res) => {
  console.log(`[ROUTE] POST /usuarios/${req.params.id} recebida`);
  return controller.atualizaUsuarioViaFormulario(req, res);
});

router.get('/usuarios/:id/inativar', (req, res) => {
  console.log(`[ROUTE] GET /usuarios/${req.params.id}/inativar recebida`);
  return controller.confirmarInativacao(req, res);
});

router.put('/usuarios/:id/inativar', (req, res) => {
  console.log(`[ROUTE] PUT /usuarios/${req.params.id}/inativar recebida`);
  return controller.inativarUsuario(req, res);
});

router.post('/usuarios/:id/inativar', (req, res) => {
  console.log(`[ROUTE] POST /usuarios/${req.params.id}/inativar recebida`);
  return controller.inativarUsuarioViaFormulario(req, res);
});

router.get('/usuarios/:id/perfil', (req, res) => {
  console.log(`[ROUTE] GET /usuarios/${req.params.id}/perfil recebida`);
  return controller.editarPerfil(req, res);
});

router.put('/usuarios/:id/perfil', (req, res) => {
  console.log(`[ROUTE] PUT /usuarios/${req.params.id}/perfil recebida`);
  return controller.atualizaPerfilDeAcesso(req, res);
});

router.post('/usuarios/:id/perfil', (req, res) => {
  console.log(`[ROUTE] POST /usuarios/${req.params.id}/perfil recebida`);
  return controller.atualizaPerfilDeAcessoViaFormulario(req, res);
});

export default router;
