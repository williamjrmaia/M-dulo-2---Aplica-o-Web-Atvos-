/* ============================================================================
 * REVISÃO DO PROFESSOR — Semana 8 (Afonso) — COMENTÁRIO DE REVISÃO, NÃO ALTERA O CÓDIGO
 * Muito bom: bcrypt + JWT + SESSÃO PERSISTIDA no banco (criar/encerrar com
 * revogação e tratamento de códigos de erro do Postgres). 2º grupo mais completo.
 * A melhorar:
 *  - JWT_SECRET tem fallback hardcoded ('secret-test') — em produção deve ser
 *    obrigatório (falhar se ausente).
 *  - autenticar() distingue "Usuário não cadastrado" de "Credenciais inválidas"
 *    -> vaza quais e-mails existem. Usar a mesma mensagem (ver authController).
 *  - console.log de email/etapas em produção — remover/usar logger.
 *  - Falta um middleware que VERIFIQUE o JWT/sessão e proteja as rotas
 *    (hoje a sessão é criada, mas nada exige autenticação — ver parceiroRoutes).
 * ========================================================================== */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthSessao } from '../models/AuthSessao';
import { AuthSessionRepository } from '../repositories/authSessionRepository';
import { Usuario, UserRepository } from '../repositories/userRepository';

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
    console.log(`[SERVICE] Buscando usuário: ${email}`);

    // RN02 — buscar usuário no banco
    const usuario = await this.userRepository.buscarPorEmail(email);

    // RN03 — e-mail não cadastrado
    if (!usuario) {
      throw new Error('Usuário não cadastrado');
    }

    // RN04 — validar senha com bcrypt
    console.log('[SERVICE] Validando senha...');
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash ?? '');
    if (!senhaValida) {
      throw new Error('Credenciais inválidas');
    }

    // RN05 — gerar JWT
    const secret = process.env.JWT_SECRET ?? 'secret-test';
    const token = jwt.sign(
      { sub: usuario.id, email: usuario.email },
      secret,
      { expiresIn: '8h' }
    );
    const expiraEm = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const sessao = await this.authSessionRepository.criarSessao(usuario.id, token, expiraEm);

    console.log('[SERVICE] Login realizado com sucesso');
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
