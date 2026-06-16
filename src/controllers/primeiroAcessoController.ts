import { Request, Response } from 'express';
import {
  definirSenhaPrimeiroAcessoWebSchema,
  definirSenhaPrimeiroAcessoSchema,
  solicitarPrimeiroAcessoSchema,
} from '../schemas/primeiroAcesso.schema';
import { PrimeiroAcessoService } from '../services/primeiroAcessoService';

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
    const email = typeof req.body?.email === 'string' ? req.body.email : '';

    if (!parsed.success) {
      const mensagem = parsed.error.issues[0]?.message ?? 'Dados inválidos';
      const error = mensagem.includes('senha')
        ? 'Senha deve ter pelo menos 8 caracteres'
        : mensagem;

      return res.status(400).render('login/primeiro-acesso', {
        error,
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
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      let status = 400;
      if (message === 'Usuário já acessou o sistema anteriormente') status = 409;
      else if (message === 'Usuário não elegível para primeiro acesso') status = 404;

      return res.status(status).render('login/primeiro-acesso', {
        error: message,
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
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      if (message === 'E-mail obrigatório') {
        return res.status(400).json({ error: message });
      }
      if (message === 'Usuário não elegível para primeiro acesso') {
        return res.status(404).json({ error: message });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  definirSenha = async (req: Request, res: Response) => {
    const parsed = definirSenhaPrimeiroAcessoSchema.safeParse(req.body);
    if (!parsed.success) {
      const mensagem = parsed.error.issues[0]?.message ?? 'Dados de entrada invalidos';
      if (mensagem === 'Senhas não coincidem') {
        return res.status(400).json({ error: mensagem });
      }
      if (mensagem.includes('senha')) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
      }
      return res.status(400).json({ error: 'Token obrigatório' });
    }
    const { token, senha } = parsed.data;

    try {
      await this.primeiroAcessoService.definirSenha(token, senha);
      return res.status(200).json({ success: 'Senha cadastrada com sucesso' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno do servidor';
      if (message === 'Token obrigatório' || message === 'Senha deve ter pelo menos 8 caracteres') {
        return res.status(400).json({ error: message });
      }
      if (message === 'Token inválido ou expirado') {
        return res.status(401).json({ error: message });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}
