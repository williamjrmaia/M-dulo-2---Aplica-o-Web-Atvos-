import { PerfilAcesso } from './PerfilAcesso';

export interface Usuario {
  id: string;
  perfil_acesso_id: string;
  nome: string;
  email: string;
  senha_hash?: string | null;
  ativo: boolean;
  criado_em: Date;
}

export interface UsuarioComPerfil extends Usuario {
  perfil?: PerfilAcesso['nome'];
}

export type CriarUsuarioDTO = Omit<Usuario, 'id' | 'criado_em'>;
export type AtualizarPerfilUsuarioDTO = Pick<Usuario, 'perfil_acesso_id'>;
export type AtualizarUsuarioDTO = Partial<
  Pick<Usuario, 'nome' | 'email' | 'ativo' | 'perfil_acesso_id'>
>;
