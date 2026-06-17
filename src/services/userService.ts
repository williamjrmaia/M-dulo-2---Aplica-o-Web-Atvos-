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

    this.validarEntradaCadastro(data);
    await this.garantirPerfilExiste(data.perfil_acesso_id);
    await this.garantirEmailDisponivel(data.email);

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

    this.validarEntradaAtualizacao(id, dados);

    if (dados.perfil_acesso_id !== undefined) {
      await this.garantirPerfilExiste(dados.perfil_acesso_id);
    }

    await this.garantirUsuarioExiste(id, 'Usuario nao localizado na base');

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

  private emailValido(email: string | undefined): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email ?? '');
  }

  private nomePreenchido(nome: string | undefined): boolean {
    return Boolean(nome && nome.trim());
  }

  private validarEntradaCadastro(data: CriarUsuarioInput): void {
    const dadosValidos = Boolean(
      data && this.nomePreenchido(data.nome) && this.emailValido(data.email) && data.perfil_acesso_id,
    );
    if (!dadosValidos) {
      throw new Error('Dados de entrada invalidos');
    }
  }

  private validarNomeAtualizacao(nome: string | undefined): void {
    if (nome !== undefined && !nome.trim()) {
      throw new Error('Dados de entrada invalidos');
    }
  }

  private validarEmailAtualizacao(email: string | undefined): void {
    if (email === undefined) {
      return;
    }
    if (!this.emailValido(email)) {
      throw new Error('Dados de entrada invalidos');
    }
  }

  private validarAtivoAtualizacao(ativo: boolean | undefined): void {
    if (ativo !== undefined && typeof ativo !== 'boolean') {
      throw new Error('Dados de entrada invalidos');
    }
  }

  private validarEntradaAtualizacao(id: string, dados: AtualizarUsuarioDTO): void {
    const temCampoParaAtualizar = Object.values(dados ?? {}).some(
      (valor) => valor !== undefined,
    );

    if (!id || !dados || !temCampoParaAtualizar) {
      throw new Error('Dados de entrada invalidos');
    }

    this.validarNomeAtualizacao(dados.nome);
    this.validarEmailAtualizacao(dados.email);
    this.validarAtivoAtualizacao(dados.ativo);
  }

  private async garantirPerfilExiste(perfilAcessoId: string): Promise<void> {
    const perfilExiste = await this.userRepository.checarExistenciaPerfil(perfilAcessoId);
    if (!perfilExiste) {
      throw new Error('Perfil nao encontrado');
    }
  }

  private async garantirEmailDisponivel(email: string): Promise<void> {
    const emailExistente = await this.userRepository.buscarPorEmail(email.toLowerCase());
    if (emailExistente) {
      throw new Error('Email ja cadastrado');
    }
  }

  private async garantirUsuarioExiste(id: string, mensagem: string): Promise<UsuarioComPerfil> {
    const usuario = await this.userRepository.buscarPorId(id);
    if (!usuario) {
      throw new Error(mensagem);
    }
    return usuario;
  }
}
