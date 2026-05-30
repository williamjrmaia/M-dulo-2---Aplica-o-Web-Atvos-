export interface AuthSessao {
  id: string;
  usuario_id: string;
  token: string;
  ativa: boolean;
  criada_em: Date;
  expira_em: Date;
  revogada_em?: Date | null;
  revogada_por?: string | null;
}
