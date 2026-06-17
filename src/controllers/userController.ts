import { Request, Response } from 'express';
import {
  atualizarPerfilUsuarioSchema,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
} from '../schemas/usuario.schema';
import { UserService } from '../services/userService';

function resolverRoleIdFormulario(
  parsed: ReturnType<typeof atualizarPerfilUsuarioSchema.safeParse>,
  body: Record<string, any>
): any {
  if (parsed.success) return parsed.data.role_id;
  return body.role_id ?? body.perfil_acesso_id;
}

function statusEMensagemErroAtualizaPerfilFormulario(error: unknown): { status: number; mensagem: string } {
  const mensagem = error instanceof Error ? error.message : 'Erro interno do servidor';
  const status = mensagem === 'Perfil nao encontrado' ? 400 : 500;
  return { status, mensagem };
}

function extrairIdParam(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function perfilDosHeaders(req: Request): unknown {
  return req.headers['x-user-role'] ?? req.headers['x-user-perfil'] ?? req.headers['x-perfil-acesso'];
}

// Responde o erro de um endpoint JSON a partir de um mapa mensagem -> status;
// mensagens não mapeadas viram 500.
function responderComMapa(res: Response, error: unknown, mapa: Record<string, number>): Response {
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';
  const status = mapa[message];
  if (status) {
    return res.status(status).json({ error: message });
  }
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

function responderPermissaoNegada(
  res: Response,
  permissao: 'autorizado' | 'nao-autenticado' | 'proibido'
): Response | null {
  if (permissao === 'nao-autenticado') {
    return res.status(401).json({ error: 'Token invalido ou ausente' });
  }
  if (permissao === 'proibido') {
    return res.status(403).json({ error: 'Usuario sem permissao de administrador' });
  }
  return null;
}

function statusErroCadastroFormulario(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';
  const status = message === 'Erro interno do servidor' ? 500 : 400;
  return { status, message };
}

function statusErroAtualizaFormulario(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';
  let status = 400;
  if (message === 'Usuario nao localizado na base') {
    status = 404;
  } else if (message === 'Erro interno do servidor') {
    status = 500;
  }
  return { status, message };
}

const ERRO_CRIA_USUARIO: Record<string, number> = {
  'Dados de entrada invalidos': 400,
  'Perfil nao encontrado': 422,
  'Email ja cadastrado': 409,
};

const ERRO_ATUALIZA_USUARIO: Record<string, number> = {
  'Dados de entrada invalidos': 400,
  'Perfil nao encontrado': 400,
  'Usuario nao localizado na base': 404,
};

const ERRO_INATIVA_USUARIO: Record<string, number> = {
  'Dados obrigatorios ausentes': 400,
  'Usuario nao encontrado': 404,
};

const ERRO_ATUALIZA_PERFIL: Record<string, number> = {
  'Dados obrigatorios ausentes': 400,
  'Perfil nao encontrado': 400,
  'Usuario nao encontrado': 404,
};

export class UserController {
  constructor(private readonly userService: UserService) {}

  private async montarUsuarioFormulario(
    id: string,
    dados: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const usuarioAtual = await this.userService.buscarUsuario(id).catch(() => null);
    return { ...(usuarioAtual ?? { id }), ...dados, id };
  }

  private validarPermissaoAdmin(req: Request): 'autorizado' | 'nao-autenticado' | 'proibido' {
    const usuarioAutenticado = (req as Request & { usuario?: { perfil?: string } }).usuario;
    if (usuarioAutenticado) {
      return usuarioAutenticado.perfil === 'administrador' ? 'autorizado' : 'proibido';
    }

    const authorization = req.headers.authorization;
    const perfil = perfilDosHeaders(req);

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
      return responderComMapa(res, error, ERRO_CRIA_USUARIO);
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
      const { status, message } = statusErroCadastroFormulario(error);
      const perfis = await this.userService.listarPerfis().catch(() => []);
      return res.status(status).render('usuarios/new', {
        error: message,
        perfis,
        dados: { nome, email, perfil_acesso_id },
      });
    }
  };

  editarUsuario = async (req: Request, res: Response) => {
    const id = extrairIdParam(req);
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
    const id = extrairIdParam(req);
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
      return responderComMapa(res, error, ERRO_ATUALIZA_USUARIO);
    }
  };

  atualizaUsuarioViaFormulario = async (req: Request, res: Response) => {
    const id = extrairIdParam(req);
    const { nome, email, ativo, perfil_acesso_id } = req.body;
    console.log(`[CONTROLLER] POST formulario edicao usuario: ${id}`);
    const parsed = atualizarUsuarioSchema.safeParse({ nome, email, ativo, perfil_acesso_id });
    if (!parsed.success) {
      return res.status(400).render('usuarios/edit', {
        error: 'Dados de entrada invalidos',
        usuario: await this.montarUsuarioFormulario(id, { nome, email, ativo, perfil_acesso_id }),
      });
    }
    try {
      await this.userService.atualizaUsuario(id, parsed.data);
      return res.redirect(`/usuarios/${id}/editar`);
    } catch (error) {
      const { status, message } = statusErroAtualizaFormulario(error);
      return res.status(status).render('usuarios/edit', {
        error: message,
        usuario: await this.montarUsuarioFormulario(id, { nome, email, ativo, perfil_acesso_id }),
      });
    }
  };

  inativarUsuario = async (req: Request, res: Response) => {
    const id = extrairIdParam(req);
    console.log(`[CONTROLLER] Inativacao de usuario recebida: ${id}`);
    const permissao = this.validarPermissaoAdmin(req);
    const respostaPermissao = responderPermissaoNegada(res, permissao);
    if (respostaPermissao) {
      return respostaPermissao;
    }
    try {
      const usuario = await this.userService.inativarUsuario(id);
      console.log('[CONTROLLER] Retornando 200');
      return res.status(200).json({ success: 'Acesso revogado e historico preservado', usuario });
    } catch (error) {
      return responderComMapa(res, error, ERRO_INATIVA_USUARIO);
    }
  };

  confirmarInativacao = async (req: Request, res: Response) => {
    const id = extrairIdParam(req);
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
    const id = extrairIdParam(req);
    console.log(`[CONTROLLER] POST formulario inativacao usuario: ${id}`);
    try {
      await this.userService.inativarUsuario(id);
      return res.redirect(`/usuarios/${id}/inativar`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      const status = message === 'Usuario nao encontrado' ? 404 : 500;
      return res.status(status).render('usuarios/inativar', {
        error: message,
        usuario: await this.montarUsuarioFormulario(id),
      });
    }
  };

  editarPerfil = async (req: Request, res: Response) => {
    const id = extrairIdParam(req);
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
    const id = extrairIdParam(req);
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
      return responderComMapa(res, error, ERRO_ATUALIZA_PERFIL);
    }
  };

  atualizaPerfilDeAcessoViaFormulario = async (req: Request, res: Response) => {
    const id = extrairIdParam(req);
    const parsed = atualizarPerfilUsuarioSchema.safeParse(req.body);
    const role_id = resolverRoleIdFormulario(parsed, req.body);
    console.log(`[CONTROLLER] POST formulario perfil para usuario: ${id}`);
    if (!parsed.success || !role_id) {
      return res.status(400).render('usuarios/perfil', {
        error: 'Dados obrigatorios ausentes',
        usuario: await this.montarUsuarioFormulario(id, { perfil_acesso_id: role_id }),
        perfis: await this.userService.listarPerfis(),
      });
    }
    try {
      await this.userService.atualizaPerfilDeAcesso(id, role_id);
      return res.redirect(`/usuarios/${id}/perfil`);
    } catch (error) {
      const { status, mensagem } = statusEMensagemErroAtualizaPerfilFormulario(error);
      return res.status(status).render('usuarios/perfil', {
        error: mensagem,
        usuario: await this.montarUsuarioFormulario(id, { perfil_acesso_id: role_id }),
        perfis: await this.userService.listarPerfis(),
      });
    }
  };
}
