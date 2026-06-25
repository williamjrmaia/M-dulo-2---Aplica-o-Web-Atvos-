import { Request, Response } from 'express';
import {
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
  getAuthCookieOptions,
} from '../config/auth';
import { encerrarSessaoSchema, loginSchema } from '../schemas/auth.schema';
import { AuthService } from '../services/authService';
import { extrairCookie } from '../helpers/cookies';

function isFormWeb(req: Request): boolean {
  return req.is('application/x-www-form-urlencoded') === 'application/x-www-form-urlencoded';
}

function mensagemValidacaoLogin(email?: string, senha?: string): string {
  if (email && senha) return 'Formato de e-mail inválido';
  return 'E-mail e senha são obrigatórios';
}

function extrairCredenciaisBrutas(body: unknown): { email?: string; senha?: string } {
  const dados = body as Record<string, unknown> | undefined;
  const email = typeof dados?.email === 'string' ? dados.email : undefined;
  const senha = typeof dados?.senha === 'string' ? dados.senha : undefined;
  return { email, senha };
}

function responderLogin(
  res: Response,
  loginWeb: boolean,
  status: number,
  payload: { error: string; email?: string }
) {
  if (loginWeb) {
    return res.status(status).render('login/index', payload);
  }
  return res.status(status).json({ error: payload.error });
}

function mapErroLogin(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';

  if (message === 'Credenciais inválidas') {
    return { status: 401, message };
  }
  if (message === 'JWT_SECRET nao configurado') {
    return { status: 500, message: 'Configuração de autenticação ausente' };
  }
  return { status: 500, message: 'Erro interno do servidor' };
}

function extrairIdParam(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

const STATUS_POR_ERRO_SESSAO: Record<string, number> = {
  'Sessao nao encontrada': 404,
  'Sessao ja encerrada': 409,
  'Usuario revogador nao encontrado': 422,
};

function responderErroEncerrarSessao(res: Response, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';
  const status = STATUS_POR_ERRO_SESSAO[message];
  if (status) {
    return res.status(status).json({ error: message });
  }
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const loginWeb = isFormWeb(req);
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const { email, senha } = extrairCredenciaisBrutas(req.body);

      return responderLogin(res, loginWeb, 400, {
        error: mensagemValidacaoLogin(email, senha),
        email,
      });
    }

    const { email, senha } = parsed.data;

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
      const { status, message } = mapErroLogin(error);

      // No fluxo web, qualquer falha de login (credenciais ou configuração
      // ausente) é exibida na própria tela de login, de forma legível, em vez
      // de devolver um JSON cru ao usuário.
      if (loginWeb) {
        return responderLogin(res, loginWeb, status, { error: message, email });
      }
      return res.status(status).json({ error: message });
    }
  };

  encerrarSessao = async (req: Request, res: Response) => {
    const id = extrairIdParam(req);
    const parsed = encerrarSessaoSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados de entrada invalidos' });
    }
    const revogadaPor = parsed.data.revogada_por;

    try {
      const sessao = await this.authService.encerrarSessao(id, revogadaPor);
      return res.status(200).json({ success: 'Sessao encerrada', sessao });
    } catch (error) {
      return responderErroEncerrarSessao(res, error);
    }
  };

  logout = async (req: Request, res: Response) => {
    const sessaoId = extrairCookie(req, AUTH_SESSION_COOKIE);
    const clearCookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };

    if (sessaoId && !(await this.encerrarSessaoBestEffort(sessaoId))) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.clearCookie(AUTH_TOKEN_COOKIE, clearCookieOptions);
    res.clearCookie(AUTH_SESSION_COOKIE, clearCookieOptions);
    return res.redirect('/login');
  };

  // Encerra a sessão tolerando erros benignos (sessão inexistente ou já
  // encerrada); retorna false apenas em erro inesperado, que vira 500.
  private async encerrarSessaoBestEffort(sessaoId: string): Promise<boolean> {
    try {
      await this.authService.encerrarSessao(sessaoId);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      return message === 'Sessao nao encontrada' || message === 'Sessao ja encerrada';
    }
  }
}
