export interface Terra {
  id: string;
  nome: string;
  area_contratada_ha: number;
  cidade: string;
  estado: string;
  status: string;
  criado_por: string;
  criado_por_nome?: string | null;
  atualizado_por?: string | null;
  atualizado_por_nome?: string | null;
  criado_em: Date;
  atualizado_em?: Date | null;
}

export interface CreateTerraInput {
  nome: string;
  area_contratada_ha: number;
  cidade: string;
  estado: string;
  criado_por: string;
  status?: string;
}

export interface UpdateTerraInput {
  nome?: string;
  area_contratada_ha?: number;
  cidade?: string;
  estado?: string;
  status?: string;
  atualizado_por: string;
}

export interface ExcluirTerraInput {
  atualizado_por: string;
  comentario?: string;
}

export interface TerraParceiro {
  id: string;
  parceiro_id: string;
  terra_id: string;
  tipo_vinculo?: string | null;
}

export interface ParceiroDaTerra {
  id: string;
  nome: string;
  apelido?: string | null;
  tipo_pessoa: string;
  cpf_cnpj: string;
  email?: string | null;
  status: string;
  criado_em: Date;
  tipo_vinculo?: string | null;
}

export interface VincularParceiroATerraInput {
  parceiro_id: string;
  tipo_vinculo?: string;
}

export interface ConsultaTerrasOpcoes {
  incluirInativos?: boolean;
  rascunhosUsuarioId?: string;
}
