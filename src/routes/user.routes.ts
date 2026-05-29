import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { UserRepository } from '../repositories/userRepository';
import { UserService } from '../services/userService';

const router = Router();

const repository = new UserRepository();
const service = new UserService(repository);
const controller = new UserController(service);

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
