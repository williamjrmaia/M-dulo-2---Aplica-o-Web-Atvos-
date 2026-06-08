import { Request, Response } from 'express';
import {
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
  getAuthCookieOptions,
} from '../config/auth';
import { AuthService } from '../services/authService';

function isFormWeb(req: Request): boolean {
  return req.is('application/x-www-form-urlencoded') === 'application/x-www-form-urlencoded';
}

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

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const { email, senha } = req.body;
    const loginWeb = isFormWeb(req);

    if (!email || !senha) {
      if (loginWeb) {
        return res.status(400).render('login/index', {
          error: 'E-mail e senha são obrigatórios',
          email,
        });
      }
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (loginWeb) {
        return res.status(400).render('login/index', {
          error: 'Formato de e-mail inválido',
          email,
        });
      }
      return res.status(400).json({ error: 'Formato de e-mail inválido' });
    }

    try {
      const resultado = await this.authService.autenticar(email, senha);

      if (loginWeb) {
        const cookieOptions = getAuthCookieOptions();
        res.cookie(AUTH_TOKEN_COOKIE, resultado.token, cookieOptions);
        res.cookie(AUTH_SESSION_COOKIE, resultado.sessao.id, cookieOptions);
        return res.redirect('/parceiros');
      }

      return res.status(200).json(resultado);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      if (message === 'Credenciais inválidas') {
        if (loginWeb) {
          return res.status(401).render('login/index', {
            error: 'Credenciais inválidas',
            email,
          });
        }
        return res.status(401).json({ error: message });
      }
      if (message === 'JWT_SECRET nao configurado') {
        return res.status(500).json({ error: 'Configuração de autenticação ausente' });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  encerrarSessao = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const revogadaPor = req.body?.revogada_por;

    try {
      const sessao = await this.authService.encerrarSessao(id, revogadaPor);
      return res.status(200).json({ success: 'Sessao encerrada', sessao });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      if (message === 'Sessao nao encontrada') {
        return res.status(404).json({ error: message });
      }
      if (message === 'Sessao ja encerrada') {
        return res.status(409).json({ error: message });
      }
      if (message === 'Usuario revogador nao encontrado') {
        return res.status(422).json({ error: message });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  logout = async (req: Request, res: Response) => {
    const sessaoId = extrairCookie(req, AUTH_SESSION_COOKIE);
    const clearCookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };

    if (sessaoId) {
      try {
        await this.authService.encerrarSessao(sessaoId);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message !== 'Sessao nao encontrada' && message !== 'Sessao ja encerrada') {
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
      }
    }

    res.clearCookie(AUTH_TOKEN_COOKIE, clearCookieOptions);
    res.clearCookie(AUTH_SESSION_COOKIE, clearCookieOptions);
    return res.redirect('/login');
  };
}
