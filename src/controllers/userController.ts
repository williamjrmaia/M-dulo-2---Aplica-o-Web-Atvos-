import { Request, Response } from 'express';
import {
  atualizarPerfilUsuarioSchema,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
} from '../schemas/usuario.schema';
import { UserService } from '../services/userService';

export class UserController {
  constructor(private readonly userService: UserService) {}

  private validarPermissaoAdmin(req: Request): 'autorizado' | 'nao-autenticado' | 'proibido' {
    const usuarioAutenticado = (req as Request & { usuario?: { perfil?: string } }).usuario;
    if (usuarioAutenticado) {
      return usuarioAutenticado.perfil === 'administrador' ? 'autorizado' : 'proibido';
    }

    const authorization = req.headers.authorization;
    const perfil =
      req.headers['x-user-role'] ??
      req.headers['x-user-perfil'] ??
      req.headers['x-perfil-acesso'];

    if (!authorization) return 'nao-autenticado';
    if (perfil !== 'administrador') return 'proibido';
    return 'autorizado';
  }

  criaUsuario = async (req: Request, res: Response) => {
    const parsed = criarUsuarioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados de entrada invalidos' });
    }
    const { nome, email, perfil_acesso_id } = parsed.data;
    console.log(`[CONTROLLER] Cadastro de usuario recebido: ${email}`);
    try {
      const usuario = await this.userService.cadastraUsuario({ nome, email, perfil_acesso_id });
      return res.status(201).location(`/api/usuarios/${usuario.id}`).json(usuario);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      if (message === 'Dados de entrada invalidos') {
        return res.status(400).json({ error: message });
      }
      if (message === 'Perfil nao encontrado') {
        return res.status(422).json({ error: message });
      }
      if (message === 'Email ja cadastrado') {
        return res.status(409).json({ error: message });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  listarUsuariosView = async (_req: Request, res: Response) => {
    console.log('[CONTROLLER] Renderizando gestao de usuarios');
    try {
      const usuarios = await this.userService.listarUsuarios();
      return res.render('usuarios/index', { usuarios, error: null });
    } catch (error) {
      return res.status(500).render('usuarios/index', { usuarios: [], error: 'Erro interno do servidor' });
    }
  };

  novoUsuarioView = async (_req: Request, res: Response) => {
    console.log('[CONTROLLER] Renderizando formulario de novo usuario');
    try {
      const perfis = await this.userService.listarPerfis();
      return res.render('usuarios/new', { perfis, dados: {}, error: null });
    } catch (error) {
      return res.status(500).render('usuarios/new', { perfis: [], dados: {}, error: 'Erro interno do servidor' });
    }
  };

  criarUsuarioViaFormulario = async (req: Request, res: Response) => {
    const { nome, email } = req.body;
    const perfil_acesso_id = req.body.perfil_acesso_id ?? req.body.role_id;
    console.log(`[CONTROLLER] POST formulario novo usuario: ${email}`);
    const parsed = criarUsuarioSchema.safeParse({ nome, email, perfil_acesso_id });
    if (!parsed.success) {
      const perfis = await this.userService.listarPerfis().catch(() => []);
      return res.status(400).render('usuarios/new', {
        error: 'Dados de entrada invalidos',
        perfis,
        dados: { nome, email, perfil_acesso_id },
      });
    }
    try {
      await this.userService.cadastraUsuario(parsed.data);
      return res.redirect('/usuarios');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      const status = message === 'Erro interno do servidor' ? 500 : 400;
      const perfis = await this.userService.listarPerfis().catch(() => []);
      return res.status(status).render('usuarios/new', {
        error: message,
        perfis,
        dados: { nome, email, perfil_acesso_id },
      });
    }
  };

  editarUsuario = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    console.log(`[CONTROLLER] Renderizando formulario de edicao do usuario: ${id}`);
    try {
      const usuario = await this.userService.buscarUsuario(id);
      if (!usuario) {
        return res.status(404).render('usuarios/edit', { error: 'Usuario nao localizado na base', usuario: null });
      }
      return res.render('usuarios/edit', { usuario, error: null });
    } catch (error) {
      return res.status(500).render('usuarios/edit', { error: 'Erro interno do servidor', usuario: null });
    }
  };

  atualizaUsuario = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = atualizarUsuarioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados de entrada invalidos' });
    }
    console.log(`[CONTROLLER] Atualizacao de usuario recebida: ${id}`);
    try {
      const usuario = await this.userService.atualizaUsuario(id, parsed.data);
      console.log('[CONTROLLER] Retornando 200');
      return res.status(200).json({ success: 'Dados atualizados com governanca', usuario });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      if (message === 'Dados de entrada invalidos' || message === 'Perfil nao encontrado') {
        return res.status(400).json({ error: message });
      }
      if (message === 'Usuario nao localizado na base') {
        return res.status(404).json({ error: message });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  atualizaUsuarioViaFormulario = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { nome, email, ativo, perfil_acesso_id } = req.body;
    console.log(`[CONTROLLER] POST formulario edicao usuario: ${id}`);
    const parsed = atualizarUsuarioSchema.safeParse({ nome, email, ativo, perfil_acesso_id });
    if (!parsed.success) {
      return res.status(400).render('usuarios/edit', {
        error: 'Dados de entrada invalidos',
        usuario: { id, nome, email, ativo, perfil_acesso_id },
      });
    }
    try {
      await this.userService.atualizaUsuario(id, parsed.data);
      return res.redirect(`/usuarios/${id}/editar`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      const status = message === 'Usuario nao localizado na base' ? 404 : message === 'Erro interno do servidor' ? 500 : 400;
      return res.status(status).render('usuarios/edit', {
        error: message,
        usuario: { id, nome, email, ativo, perfil_acesso_id },
      });
    }
  };

  inativarUsuario = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    console.log(`[CONTROLLER] Inativacao de usuario recebida: ${id}`);
    const permissao = this.validarPermissaoAdmin(req);
    if (permissao === 'nao-autenticado') return res.status(401).json({ error: 'Token invalido ou ausente' });
    if (permissao === 'proibido') return res.status(403).json({ error: 'Usuario sem permissao de administrador' });
    try {
      const usuario = await this.userService.inativarUsuario(id);
      console.log('[CONTROLLER] Retornando 200');
      return res.status(200).json({ success: 'Acesso revogado e historico preservado', usuario });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      if (message === 'Dados obrigatorios ausentes') return res.status(400).json({ error: message });
      if (message === 'Usuario nao encontrado') return res.status(404).json({ error: message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  confirmarInativacao = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    console.log(`[CONTROLLER] Renderizando confirmacao de inativacao: ${id}`);
    try {
      const usuario = await this.userService.buscarUsuario(id);
      if (!usuario) {
        return res.status(404).render('usuarios/inativar', { error: 'Usuario nao encontrado', usuario: null });
      }
      return res.render('usuarios/inativar', { usuario, error: null });
    } catch (error) {
      return res.status(500).render('usuarios/inativar', { error: 'Erro interno do servidor', usuario: null });
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
      return res.status(status).render('usuarios/inativar', { error: message, usuario: { id } });
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
        return res.status(404).render('usuarios/perfil', { error: 'Usuario nao encontrado', usuario: null, perfis });
      }
      return res.render('usuarios/perfil', { usuario, perfis, error: null });
    } catch (error) {
      return res.status(500).render('usuarios/perfil', { error: 'Erro interno do servidor', usuario: null, perfis: [] });
    }
  };

  atualizaPerfilDeAcesso = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = atualizarPerfilUsuarioSchema.safeParse(req.body);
    if (!parsed.success || !parsed.data.role_id) {
      return res.status(400).json({ error: 'Dados obrigatorios ausentes' });
    }
    const role_id = parsed.data.role_id;
    console.log(`[CONTROLLER] Atualizacao de perfil recebida para usuario: ${id}`);
    try {
      const usuario = await this.userService.atualizaPerfilDeAcesso(id, role_id);
      console.log('[CONTROLLER] Retornando 200');
      return res.status(200).json({ success: 'Perfil de acesso atualizado', usuario });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      if (message === 'Dados obrigatorios ausentes' || message === 'Perfil nao encontrado') {
        return res.status(400).json({ error: message });
      }
      if (message === 'Usuario nao encontrado') return res.status(404).json({ error: message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  atualizaPerfilDeAcessoViaFormulario = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = atualizarPerfilUsuarioSchema.safeParse(req.body);
    const role_id = parsed.success ? parsed.data.role_id : req.body.role_id ?? req.body.perfil_acesso_id;
    console.log(`[CONTROLLER] POST formulario perfil para usuario: ${id}`);
    if (!parsed.success || !role_id) {
      return res.status(400).render('usuarios/perfil', {
        error: 'Dados obrigatorios ausentes',
        usuario: { id, perfil_acesso_id: role_id },
        perfis: await this.userService.listarPerfis(),
      });
    }
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
