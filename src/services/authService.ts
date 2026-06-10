import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/auth';
import { AuthSessao } from '../models/AuthSessao';
import { AuthSessionRepository } from '../repositories/authSessionRepository';
import { UserRepository } from '../repositories/userRepository';

export interface LoginResult {
  token: string;
  usuario: { id: string; nome: string; email: string };
  sessao: { id: string; expira_em: Date };
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authSessionRepository = new AuthSessionRepository()
  ) {}

  async autenticar(email: string, senha: string): Promise<LoginResult> {
    const usuario = await this.userRepository.buscarPorEmail(email);

    if (!usuario) {
      throw new Error('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash ?? '');
    if (!senhaValida) {
      throw new Error('Credenciais inválidas');
    }

    const token = jwt.sign(
      { sub: usuario.id, email: usuario.email },
      getJwtSecret(),
      { expiresIn: '8h' }
    );
    const expiraEm = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const sessao = await this.authSessionRepository.criarSessao(usuario.id, token, expiraEm);

    return {
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      sessao: { id: sessao.id, expira_em: sessao.expira_em },
    };
  }

  async encerrarSessao(id: string, revogadaPor?: string): Promise<AuthSessao> {
    try {
      const sessaoExistente = await this.authSessionRepository.buscarSessao(id);
      if (!sessaoExistente) {
        throw new Error('Sessao nao encontrada');
      }
      if (!sessaoExistente.ativa) {
        throw new Error('Sessao ja encerrada');
      }

      const sessao = await this.authSessionRepository.encerrarSessao(id, revogadaPor);
      if (!sessao) {
        throw new Error('Sessao ja encerrada');
      }

      return sessao;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '22P02') {
        throw new Error('Sessao nao encontrada');
      }
      if ((err as { code?: string }).code === '23503') {
        throw new Error('Usuario revogador nao encontrado');
      }
      throw err;
    }
  }
}
