export interface Interacao {
  id: string;
  parceiro_id: string;
  registrado_por: string;
  tipo: string;
  descricao: string;
  data: string;
  criado_em?: Date;
}

export interface CriarInteracaoDTO {
  registrado_por: string;
  tipo: string;
  descricao: string;
  data: string;
}