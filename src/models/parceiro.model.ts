export interface ParceiroExportacao {
  id: string;
  nome: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  email: string | null;
  status: string;
  criado_em: Date;
}