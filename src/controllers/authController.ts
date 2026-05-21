import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const { email, senha } = req.body;

    // Payload inválido — campos ausentes
    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Formato de e-mail inválido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de e-mail inválido' });
    }

    console.log(`[CONTROLLER] Login solicitado para: ${email}`);

    try {
      const resultado = await this.authService.autenticar(email, senha);
      console.log('[CONTROLLER] Retornando 200');
      return res.status(200).json(resultado);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      if (message === 'Usuário não cadastrado') {
        return res.status(404).json({ error: message });
      }
      if (message === 'Credenciais inválidas') {
        return res.status(401).json({ error: message });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}