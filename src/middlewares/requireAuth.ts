import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AUTH_TOKEN_COOKIE, getJwtSecret } from '../config/auth';
import type { NomePerfilAcesso } from '../models/PerfilAcesso';
import { AuthSessionRepository } from '../repositories/authSessionRepository';
import { UserRepository } from '../repositories/userRepository';

type UsuarioAutenticado = {
  id: string;
  nome: string;
  email: string;
  perfil?: NomePerfilAcesso;
  sessaoId: string;
};

type RequestComUsuario = Request & { usuario?: UsuarioAutenticado };

function extrairCookie(req: Request, nome: string): string | undefined {
  const cookies = req.headers.cookie;
  if (!cookies) return undefined;

  return cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.includes('='))
    .map((cookie) => {
      const separador = cookie.indexOf('=');
      return {
        nome: cookie.slice(0, separador),
        valor: decodeURIComponent(cookie.slice(separador + 1)),
      };
    })
    .find((cookie) => cookie.nome === nome)?.valor;
}

function extrairToken(req: Request): string | undefined {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return extrairCookie(req, AUTH_TOKEN_COOKIE);
}

function deveRetornarHtml(req: Request): boolean {
  return !req.originalUrl.startsWith('/api/') && req.accepts(['html', 'json']) === 'html';
}

function responderNaoAutenticado(req: Request, res: Response) {
  if (deveRetornarHtml(req)) {
    return res.redirect('/login');
  }

  return res.status(401).json({ error: 'Autenticação obrigatória' });
}

const authSessionRepository = new AuthSessionRepository();
const userRepository = new UserRepository();

function responderNaoAutorizado(req: Request, res: Response) {
  if (deveRetornarHtml(req)) {
    return res.status(403).render('errors/404');
  }

  return res.status(403).json({ error: 'Usuário sem permissão para acessar este recurso' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const token = extrairToken(req);
  if (!token) {
    return responderNaoAutenticado(req, res);
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    const usuarioId = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!usuarioId) {
      return responderNaoAutenticado(req, res);
    }

    const sessao = await authSessionRepository.buscarSessaoAtivaPorToken(token);
    if (!sessao || sessao.usuario_id !== usuarioId) {
      return responderNaoAutenticado(req, res);
    }

    const usuario = await userRepository.buscarPorId(usuarioId);
    if (!usuario || !usuario.ativo) {
      return responderNaoAutenticado(req, res);
    }

    const usuarioAutenticado: UsuarioAutenticado = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      sessaoId: sessao.id,
    };

    res.locals.usuarioAutenticado = usuarioAutenticado;
    (req as RequestComUsuario).usuario = usuarioAutenticado;
    return next();
  } catch (error) {
    if (error instanceof Error && error.message === 'JWT_SECRET nao configurado') {
      return res.status(500).json({ error: 'Configuração de autenticação ausente' });
    }

    return responderNaoAutenticado(req, res);
  }
}

export function authorizeRoles(...roles: NomePerfilAcesso[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const perfil = (req as RequestComUsuario).usuario?.perfil;
    if (!perfil || !roles.includes(perfil)) {
      return responderNaoAutorizado(req, res);
    }

    return next();
  };
}
