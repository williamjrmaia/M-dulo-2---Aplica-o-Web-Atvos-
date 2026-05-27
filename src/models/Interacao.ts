export interface Interacao {
  id: string;
  parceiro_id: string;
  registrado_por: string;
  tipo: string;
  descricao: string;
  data: string;
  criado_em?: Date;
}

export type CriarInteracaoDTO = Omit<Interacao, 'id' | 'criado_em' | 'parceiro_id'>;
