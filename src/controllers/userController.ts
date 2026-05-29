import { Request, Response } from 'express';
import { UserService } from '../services/userService';

export class UserController {
  constructor(private readonly userService: UserService) {}

  private validarPermissaoAdmin(req: Request): 'autorizado' | 'nao-autenticado' | 'proibido' {
    const authorization = req.headers.authorization;
    const perfil =
      req.headers['x-user-role'] ??
      req.headers['x-user-perfil'] ??
      req.headers['x-perfil-acesso'];

    if (!authorization) {
      return 'nao-autenticado';
    }

    if (perfil !== 'administrador') {
      return 'proibido';
    }

    return 'autorizado';
  }

  inativarUsuario = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    console.log(`[CONTROLLER] Inativacao de usuario recebida: ${id}`);

    const permissao = this.validarPermissaoAdmin(req);
    if (permissao === 'nao-autenticado') {
      return res.status(401).json({ error: 'Token invalido ou ausente' });
    }

    if (permissao === 'proibido') {
      return res.status(403).json({ error: 'Usuario sem permissao de administrador' });
    }

    try {
      const usuario = await this.userService.inativarUsuario(id);
      console.log('[CONTROLLER] Retornando 200');
      return res.status(200).json({
        success: 'Acesso revogado e historico preservado',
        usuario,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';

      if (message === 'Dados obrigatorios ausentes') {
        return res.status(400).json({ error: message });
      }

      if (message === 'Usuario nao encontrado') {
        return res.status(404).json({ error: message });
      }

      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  confirmarInativacao = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    console.log(`[CONTROLLER] Renderizando confirmacao de inativacao: ${id}`);

    try {
      const usuario = await this.userService.buscarUsuario(id);

      if (!usuario) {
        return res.status(404).render('usuarios/inativar', {
          error: 'Usuario nao encontrado',
          usuario: null,
        });
      }

      return res.render('usuarios/inativar', { usuario, error: null });
    } catch (error) {
      return res.status(500).render('usuarios/inativar', {
        error: 'Erro interno do servidor',
        usuario: null,
      });
    }
  };

  inativarUsuarioViaFormulario = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    console.log(`[CONTROLLER] POST formulario inativacao usuario: ${id}`);

    try {
      await this.userService.inativarUsuario(id);
      return res.redirect(`/usuarios/${id}/inativar`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      const status = message === 'Usuario nao encontrado' ? 404 : 500;

      return res.status(status).render('usuarios/inativar', {
        error: message,
        usuario: { id },
      });
    }
  };

  editarPerfil = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    console.log(`[CONTROLLER] Renderizando formulario de perfil do usuario: ${id}`);

    try {
      const [usuario, perfis] = await Promise.all([
        this.userService.buscarUsuario(id),
        this.userService.listarPerfis(),
      ]);

      if (!usuario) {
        return res.status(404).render('usuarios/perfil', {
          error: 'Usuario nao encontrado',
          usuario: null,
          perfis,
        });
      }

      return res.render('usuarios/perfil', { usuario, perfis, error: null });
    } catch (error) {
      return res.status(500).render('usuarios/perfil', {
        error: 'Erro interno do servidor',
        usuario: null,
        perfis: [],
      });
    }
  };

  atualizaPerfilDeAcesso = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const role_id = req.body.role_id ?? req.body.perfil_acesso_id;

    console.log(`[CONTROLLER] Atualizacao de perfil recebida para usuario: ${id}`);

    try {
      const usuario = await this.userService.atualizaPerfilDeAcesso(id, role_id);
      console.log('[CONTROLLER] Retornando 200');
      return res.status(200).json({
        success: 'Perfil de acesso atualizado',
        usuario,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';

      if (message === 'Dados obrigatorios ausentes' || message === 'Perfil nao encontrado') {
        return res.status(400).json({ error: message });
      }

      if (message === 'Usuario nao encontrado') {
        return res.status(404).json({ error: message });
      }

      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  atualizaPerfilDeAcessoViaFormulario = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const role_id = req.body.role_id ?? req.body.perfil_acesso_id;

    console.log(`[CONTROLLER] POST formulario perfil para usuario: ${id}`);

    try {
      await this.userService.atualizaPerfilDeAcesso(id, role_id);
      return res.redirect(`/usuarios/${id}/perfil`);
    } catch (error) {
      const status = error instanceof Error && error.message === 'Perfil nao encontrado' ? 400 : 500;
      return res.status(status).render('usuarios/perfil', {
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        usuario: { id, perfil_acesso_id: role_id },
        perfis: await this.userService.listarPerfis(),
      });
    }
  };
}
