import { PerfilAcesso } from '../models/PerfilAcesso';
import { UsuarioComPerfil } from '../models/Usuario';
import { UserRepository } from '../repositories/userRepository';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async listarPerfis(): Promise<PerfilAcesso[]> {
    console.log('[SERVICE] listarPerfis');
    return this.userRepository.listarPerfis();
  }

  async buscarUsuario(id: string): Promise<UsuarioComPerfil | null> {
    console.log(`[SERVICE] buscarUsuario: ${id}`);
    return this.userRepository.buscarPorId(id);
  }

  async atualizaPerfilDeAcesso(id: string, role_id: string): Promise<UsuarioComPerfil> {
    console.log(`[SERVICE] atualizaPerfilDeAcesso usuario: ${id}, perfil: ${role_id}`);

    if (!id || !role_id) {
      throw new Error('Dados obrigatorios ausentes');
    }

    const perfilExiste = await this.userRepository.checarExistenciaPerfil(role_id);
    if (!perfilExiste) {
      throw new Error('Perfil nao encontrado');
    }

    const usuarioAtualizado = await this.userRepository.atualizaPerfilDeAcesso(id, role_id);
    if (!usuarioAtualizado) {
      throw new Error('Usuario nao encontrado');
    }

    console.log('[SERVICE] Perfil de acesso atualizado com sucesso');
    return usuarioAtualizado;
  }

  async inativarUsuario(id: string): Promise<UsuarioComPerfil> {
    console.log(`[SERVICE] inativarUsuario: ${id}`);

    if (!id) {
      throw new Error('Dados obrigatorios ausentes');
    }

    const usuarioExistente = await this.userRepository.buscarPorId(id);
    if (!usuarioExistente) {
      throw new Error('Usuario nao encontrado');
    }

    const usuarioInativado = await this.userRepository.inativarUsuario(id);
    if (!usuarioInativado) {
      throw new Error('Usuario nao encontrado');
    }

    console.log('[SERVICE] Usuario inativado com sucesso');
    return usuarioInativado;
  }
}
