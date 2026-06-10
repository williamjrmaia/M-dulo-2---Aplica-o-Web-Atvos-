import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrimeiroAcessoRepository } from '../repositories/primeiroAcessoRepository';
import { UserRepository } from '../repositories/userRepository';

const TOKEN_EXPIRACAO_HORAS = 24;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function validarSenha(senha: string): void {
  if (!senha || senha.length < 8) {
    throw new Error('Senha deve ter pelo menos 8 caracteres');
  }
}

export class PrimeiroAcessoService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly primeiroAcessoRepository = new PrimeiroAcessoRepository()
  ) {}

  async solicitarToken(email: string): Promise<{ token: string; expira_em: Date }> {
    if (!email) {
      throw new Error('E-mail obrigatório');
    }

    const usuario = await this.userRepository.buscarPorEmail(email.toLowerCase());
    if (!usuario || !usuario.ativo || usuario.senha_hash) {
      throw new Error('Usuário não elegível para primeiro acesso');
    }

    const token = randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + TOKEN_EXPIRACAO_HORAS * 60 * 60 * 1000);

    await this.primeiroAcessoRepository.invalidarTokensPendentes(usuario.id);
    await this.primeiroAcessoRepository.criarToken(usuario.id, hashToken(token), expiraEm);

    return { token, expira_em: expiraEm };
  }

  async definirSenha(token: string, senha: string): Promise<void> {
    if (!token) {
      throw new Error('Token obrigatório');
    }

    validarSenha(senha);

    const registro = await this.primeiroAcessoRepository.buscarTokenValido(hashToken(token));
    if (!registro) {
      throw new Error('Token inválido ou expirado');
    }

    const usuario = await this.userRepository.buscarPorId(registro.usuario_id);
    if (!usuario || !usuario.ativo || usuario.senha_hash) {
      throw new Error('Token inválido ou expirado');
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    await this.userRepository.definirSenha(usuario.id, senhaHash);
    await this.primeiroAcessoRepository.marcarComoUsado(registro.id);
  }
}
