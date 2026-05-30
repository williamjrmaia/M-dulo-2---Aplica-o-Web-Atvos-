export interface InteracoesListEntity {
  tipo_interacao: string;
  status: string;
  total: number;
}

export interface DashboardInteracoesDTO {
  total_interacoes: number;
  por_tipo: { tipo: string; total: number }[];
  por_status: { status: string; total: number }[];
  kpi_engajamento: number;
}