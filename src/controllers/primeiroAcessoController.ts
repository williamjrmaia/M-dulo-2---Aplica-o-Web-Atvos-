import { Request, Response } from 'express';
import {
  definirSenhaPrimeiroAcessoWebSchema,
  definirSenhaPrimeiroAcessoSchema,
  solicitarPrimeiroAcessoSchema,
} from '../schemas/primeiroAcesso.schema';
import { PrimeiroAcessoService } from '../services/primeiroAcessoService';

function mensagemErroValidacaoSenha(mensagemBruta: string): string {
  return mensagemBruta.includes('senha') ? 'Senha deve ter pelo menos 8 caracteres' : mensagemBruta;
}

function extrairEmailFormulario(body: unknown): string {
  const dados = body as Record<string, unknown> | undefined;
  return typeof dados?.email === 'string' ? dados.email : '';
}

function mensagemDeErro(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro interno do servidor';
}

function statusErroDefinirSenhaViaFormulario(error: unknown): number {
  const message = error instanceof Error ? error.message : '';
  if (message === 'Usuário já acessou o sistema anteriormente') return 409;
  if (message === 'Usuário não elegível para primeiro acesso') return 404;
  return 400;
}

function statusEMensagemValidacaoSenhaToken(mensagemBruta: string): { status: number; mensagem: string } {
  if (mensagemBruta === 'Senhas não coincidem') return { status: 400, mensagem: mensagemBruta };
  if (mensagemBruta.includes('senha')) {
    return { status: 400, mensagem: 'Senha deve ter pelo menos 8 caracteres' };
  }
  return { status: 400, mensagem: 'Token obrigatório' };
}

function mapErroDefinirSenha(error: unknown): { status: number; mensagem: string } {
  const mensagem = error instanceof Error ? error.message : 'Erro interno do servidor';
  if (mensagem === 'Token obrigatório' || mensagem === 'Senha deve ter pelo menos 8 caracteres') {
    return { status: 400, mensagem };
  }
  if (mensagem === 'Token inválido ou expirado') {
    return { status: 401, mensagem };
  }
  return { status: 500, mensagem: 'Erro interno do servidor' };
}

function responderErroSolicitarToken(res: Response, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';
  if (message === 'E-mail obrigatório') {
    return res.status(400).json({ error: message });
  }
  if (message === 'Usuário não elegível para primeiro acesso') {
    return res.status(404).json({ error: message });
  }
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

export class PrimeiroAcessoController {
  constructor(private readonly primeiroAcessoService: PrimeiroAcessoService) {}

  renderFormPrimeiroAcesso = (_req: Request, res: Response) => {
    return res.render('login/primeiro-acesso', {
      error: null,
      success: null,
      email: '',
    });
  };

  definirSenhaViaFormulario = async (req: Request, res: Response) => {
    const parsed = definirSenhaPrimeiroAcessoWebSchema.safeParse(req.body);
    const email = extrairEmailFormulario(req.body);

    if (!parsed.success) {
      const mensagem = parsed.error.issues[0]?.message ?? 'Dados inválidos';

      return res.status(400).render('login/primeiro-acesso', {
        error: mensagemErroValidacaoSenha(mensagem),
        success: null,
        email,
      });
    }

    try {
      await this.primeiroAcessoService.definirSenhaPorEmail(parsed.data.email, parsed.data.senha);
      return res.status(200).render('login/primeiro-acesso', {
        error: null,
        success: 'Senha cadastrada com sucesso. Volte para a tela de login para acessar o sistema.',
        email: parsed.data.email,
      });
    } catch (error) {
      const status = statusErroDefinirSenhaViaFormulario(error);

      return res.status(status).render('login/primeiro-acesso', {
        error: mensagemDeErro(error),
        success: null,
        email,
      });
    }
  };

  solicitarToken = async (req: Request, res: Response) => {
    const parsed = solicitarPrimeiroAcessoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'E-mail obrigatório' });
    }
    const { email } = parsed.data;

    try {
      const convite = await this.primeiroAcessoService.solicitarToken(email);
      return res.status(200).json(convite);
    } catch (error) {
      return responderErroSolicitarToken(res, error);
    }
  };

  definirSenha = async (req: Request, res: Response) => {
    const parsed = definirSenhaPrimeiroAcessoSchema.safeParse(req.body);
    if (!parsed.success) {
      const mensagemBruta = parsed.error.issues[0]?.message ?? 'Dados de entrada invalidos';
      const { status, mensagem } = statusEMensagemValidacaoSenhaToken(mensagemBruta);
      return res.status(status).json({ error: mensagem });
    }
    const { token, senha } = parsed.data;

    try {
      await this.primeiroAcessoService.definirSenha(token, senha);
      return res.status(200).json({ success: 'Senha cadastrada com sucesso' });
    } catch (error) {
      const { status, mensagem } = mapErroDefinirSenha(error);
      return res.status(status).json({ error: mensagem });
    }
  };
}
