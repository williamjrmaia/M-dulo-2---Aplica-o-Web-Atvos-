import { Request, Response } from 'express';
import { PrimeiroAcessoService } from '../services/primeiroAcessoService';

export class PrimeiroAcessoController {
  constructor(private readonly primeiroAcessoService: PrimeiroAcessoService) {}

  solicitarToken = async (req: Request, res: Response) => {
    const { email } = req.body;

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
    const { token, senha, confirmacao_senha } = req.body;

    if (senha !== confirmacao_senha) {
      return res.status(400).json({ error: 'Senhas não coincidem' });
    }

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
