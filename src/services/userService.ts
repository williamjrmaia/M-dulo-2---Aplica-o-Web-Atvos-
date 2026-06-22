import { PerfilAcesso } from '../models/PerfilAcesso';
import { AtualizarUsuarioDTO, CriarUsuarioInput, UsuarioComPerfil } from '../models/Usuario';
import { AuthSessionRepository } from '../repositories/authSessionRepository';
import { UserRepository } from '../repositories/userRepository';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authSessionRepository = new AuthSessionRepository()
  ) {}

  async listarPerfis(): Promise<PerfilAcesso[]> {
    console.log('[SERVICE] listarPerfis');
    return this.userRepository.listarPerfis();
  }

  async listarUsuarios(): Promise<UsuarioComPerfil[]> {
    console.log('[SERVICE] listarUsuarios');
    return this.userRepository.listarUsuarios();
  }

  async buscarUsuario(id: string): Promise<UsuarioComPerfil | null> {
    console.log(`[SERVICE] buscarUsuario: ${id}`);
    return this.userRepository.buscarPorId(id);
  }

  async cadastraUsuario(data: CriarUsuarioInput): Promise<UsuarioComPerfil> {
    console.log(`[SERVICE] cadastraUsuario: ${data?.email}`);

    const emailRegex = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
    if (!data || !data.nome?.trim() || !emailRegex.test(data.email ?? '') || !data.perfil_acesso_id) {
      throw new Error('Dados de entrada invalidos');
    }

    const perfilExiste = await this.userRepository.checarExistenciaPerfil(data.perfil_acesso_id);
    if (!perfilExiste) {
      throw new Error('Perfil nao encontrado');
    }

    const emailExistente = await this.userRepository.buscarPorEmail(data.email.toLowerCase());
    if (emailExistente) {
      throw new Error('Email ja cadastrado');
    }

    return this.userRepository.criaUsuario({
      nome: data.nome.trim(),
      email: data.email.toLowerCase(),
      perfil_acesso_id: data.perfil_acesso_id,
    });
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

  async atualizaUsuario(id: string, dados: AtualizarUsuarioDTO): Promise<UsuarioComPerfil> {
    console.log(`[SERVICE] atualizaUsuario: ${id}`);

    const temCampoParaAtualizar = Object.values(dados ?? {}).some(
      (valor) => valor !== undefined,
    );

    if (!id || !dados || !temCampoParaAtualizar) {
      throw new Error('Dados de entrada invalidos');
    }

    if (dados.nome !== undefined && !dados.nome.trim()) {
      throw new Error('Dados de entrada invalidos');
    }

    if (dados.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
      if (!emailRegex.test(dados.email)) {
        throw new Error('Dados de entrada invalidos');
      }
    }

    if (dados.ativo !== undefined && typeof dados.ativo !== 'boolean') {
      throw new Error('Dados de entrada invalidos');
    }

    if (dados.perfil_acesso_id !== undefined) {
      const perfilExiste = await this.userRepository.checarExistenciaPerfil(dados.perfil_acesso_id);
      if (!perfilExiste) {
        throw new Error('Perfil nao encontrado');
      }
    }

    const usuarioExistente = await this.userRepository.buscarPorId(id);
    if (!usuarioExistente) {
      throw new Error('Usuario nao localizado na base');
    }

    const usuarioAtualizado = await this.userRepository.atualizaUsuario(id, dados);
    if (!usuarioAtualizado) {
      throw new Error('Usuario nao localizado na base');
    }

    console.log('[SERVICE] Usuario atualizado com sucesso');
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

    await this.authSessionRepository.encerrarSessoesAtivasDoUsuario(id);

    console.log('[SERVICE] Usuario inativado com sucesso');
    return usuarioInativado;
  }
}
