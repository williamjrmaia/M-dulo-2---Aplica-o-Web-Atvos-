import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario, UserRepository } from '../repositories/userRepository';

export interface LoginResult {
  token: string;
  usuario: { id: string; nome: string; email: string };
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

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

    console.log('[SERVICE] Login realizado com sucesso');
    return {
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    };
  }
}