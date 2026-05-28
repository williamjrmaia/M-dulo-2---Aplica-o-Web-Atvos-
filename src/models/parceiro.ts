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
