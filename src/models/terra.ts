export interface Terra {
  id: string;
  nome: string;
  area_contratada_ha: number;
  cidade: string;
  estado: string;
  status: string;
  criado_por: string;
  atualizado_por?: string | null;
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
