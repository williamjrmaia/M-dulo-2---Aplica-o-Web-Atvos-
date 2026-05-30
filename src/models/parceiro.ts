export interface Parceiro {
    id: string;
    nome: string;
    apelido: string | null;
    tipo_pessoa: 'fisica' | 'juridica';
    cpf_cnpj: string;
    email: string;
    data_nascimento: string | null;
    nome_acompanhante?: string | null;
    status: string;
    criado_por: string;
    atualizado_por?: string | null;
    criado_em: Date;
    atualizado_em?: Date | null;
}

export interface CreateParceiroInput {
    nome: string;
    apelido?: string;
    tipo_pessoa: 'fisica' | 'juridica';
    cpf_cnpj: string;
    email?: string;
    data_nascimento?: string;
    nome_acompanhante?: string;
    criado_por: string;
}

export interface UpdateParceiroInput {
    nome?: string;
    apelido?: string;
    tipo_pessoa?: 'fisica' | 'juridica';
    cpf_cnpj?: string;
    email?: string;
    data_nascimento?: string;
    nome_acompanhante?: string;
    status?: string;
    atualizado_por: string;
}

export interface ParceiroTerra {
    id: string;
    parceiro_id: string;
    terra_id: string;
    tipo_vinculo?: string | null;
}

export interface TerraDoParceiro {
    id: string;
    nome: string;
    area_contratada_ha: number;
    cidade: string;
    estado: string;
    status: string;
    criado_em: Date;
    tipo_vinculo?: string | null;
}

export interface VincularTerraAoParceiroInput {
    terra_id: string;
    tipo_vinculo?: string;
}

export interface ListarParceirosFiltros {
    nome?: string;
    regiao?: string;
    area?: number;
    tipo?: 'fisica' | 'juridica' | 'arrendador' | 'fornecedor';
}

export interface HistoricoParceiro {
    id: string;
    usuario_id: string;
    aprovado_por?: string | null;
    entidade_afetada: string;
    entidade_id: string;
    tipo_operacao: string;
    dados_anteriores?: Record<string, unknown> | null;
    dados_novos?: Record<string, unknown> | null;
    status: string;
    comentario?: string | null;
    data_solicitacao: Date;
    data_aprovacao?: Date | null;
    data_alteracao: Date;
}
