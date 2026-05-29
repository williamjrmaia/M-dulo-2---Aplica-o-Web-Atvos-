export type NomePerfilAcesso = 'analista' | 'coordenador' | 'administrador';

export interface PerfilAcesso {
  id: string;
  nome: NomePerfilAcesso;
  requer_aprovacao: boolean;
  descricao?: string | null;
}

export type CriarPerfilAcessoDTO = Omit<PerfilAcesso, 'id'>;
