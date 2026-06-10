export interface Parceiro {
    id: string;
    nome: string;
    apelido: string | null;
    tipo_pessoa: 'fisica' | 'juridica';
    cpf_cnpj: string;
    email: string;
    data_nascimento: string | null;
    nome_acompanhante?: string | null;
    telefone?: string | null;
    regiao?: string | null;
    inscricao_estadual?: string | null;
    usina_referencia?: string | null;
    area_plantada?: string | null;
    tch_medio?: string | null;
    atr_medio?: string | null;
    observacoes?: string | null;
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
    telefone?: string;
    regiao?: string;
    inscricao_estadual?: string;
    usina_referencia?: string;
    area_plantada?: string;
    tch_medio?: string;
    atr_medio?: string;
    observacoes?: string;
    status?: 'rascunho' | 'pendente';
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
    telefone?: string;
    regiao?: string;
    inscricao_estadual?: string;
    usina_referencia?: string;
    area_plantada?: string;
    tch_medio?: string;
    atr_medio?: string;
    observacoes?: string;
    status?: string;
    atualizado_por: string;
}

export interface ParceiroTerra {
    id: string;
    parceiro_id: string;
    terra_id: string;
    tipo_vinculo?: string | null;
    tipo_parceiro?: 'arrendador' | 'fornecedor' | null;
    modalidade_contrato?: string | null;
    data_inicio?: string | null;
    data_fim?: string | null;
    observacoes?: string | null;
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
    tipo_parceiro?: 'arrendador' | 'fornecedor';
    modalidade_contrato?: string;
    data_inicio?: string;
    data_fim?: string;
    observacoes?: string;
}

export interface ListarParceirosFiltros {
    nome?: string;
    regiao?: string;
    area?: number;
    tipo?: 'fisica' | 'juridica' | 'arrendador' | 'fornecedor';
    status?: 'rascunho' | 'pendente' | 'ativo' | 'devolvido';
    usina_referencia?: string;
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

export interface ParceiroPendenteValidacao extends Parceiro {
    data_envio?: Date | null;
}

export interface EnviarParceiroValidacaoInput {
    atualizado_por: string;
    comentario?: string;
}

export interface AprovarParceiroInput {
    aprovado_por: string;
    comentario?: string;
}

export interface DevolverParceiroInput {
    devolvido_por: string;
    comentario?: string;
}

export interface ExcluirParceiroInput {
    atualizado_por: string;
    comentario?: string;
}
