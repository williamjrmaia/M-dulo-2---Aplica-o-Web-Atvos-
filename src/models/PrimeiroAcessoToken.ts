export interface PrimeiroAcessoToken {
  id: string;
  usuario_id: string;
  token_hash: string;
  criado_em: Date;
  expira_em: Date;
  usado_em?: Date | null;
}
