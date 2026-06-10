CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_validacao') THEN
    CREATE TYPE status_validacao AS ENUM ('rascunho', 'pendente', 'ativo', 'devolvido', 'inativo');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS perfil_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR NOT NULL UNIQUE CHECK (nome IN ('analista', 'coordenador', 'administrador')),
  requer_aprovacao BOOLEAN NOT NULL DEFAULT FALSE,
  descricao TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_acesso_id UUID NOT NULL REFERENCES perfil_acesso(id),
  nome VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  senha_hash VARCHAR,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuario_perfil ON usuarios(perfil_acesso_id);
CREATE INDEX IF NOT EXISTS idx_usuario_nome ON usuarios(nome);

CREATE TABLE IF NOT EXISTS auth_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  criada_em TIMESTAMP NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMP NOT NULL,
  revogada_em TIMESTAMP,
  revogada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessoes_usuario ON auth_sessoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessoes_ativa ON auth_sessoes(ativa);

CREATE TABLE IF NOT EXISTS primeiro_acesso_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMP NOT NULL,
  usado_em TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_primeiro_acesso_usuario ON primeiro_acesso_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_primeiro_acesso_token_hash ON primeiro_acesso_tokens(token_hash);

CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR NOT NULL UNIQUE,
  nome VARCHAR NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR NOT NULL,
  apelido VARCHAR,
  tipo_pessoa VARCHAR NOT NULL CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  cpf_cnpj VARCHAR NOT NULL UNIQUE,
  email VARCHAR,
  data_nascimento DATE,
  nome_acompanhante VARCHAR,
  status status_validacao NOT NULL DEFAULT 'rascunho',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP,
  criado_por UUID NOT NULL REFERENCES usuarios(id),
  atualizado_por UUID REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_parceiro_status ON parceiros(status);
CREATE INDEX IF NOT EXISTS idx_parceiro_cpf_cnpj ON parceiros(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_parceiro_nome ON parceiros(nome);
CREATE INDEX IF NOT EXISTS idx_parceiro_tipo_pessoa ON parceiros(tipo_pessoa);

CREATE TABLE IF NOT EXISTS terras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR NOT NULL,
  area_contratada_ha DECIMAL(12,4) NOT NULL CHECK (area_contratada_ha > 0),
  cidade VARCHAR NOT NULL,
  estado VARCHAR(2) NOT NULL,
  status status_validacao NOT NULL DEFAULT 'rascunho',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP,
  criado_por UUID NOT NULL REFERENCES usuarios(id),
  atualizado_por UUID REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_terra_status ON terras(status);
CREATE INDEX IF NOT EXISTS idx_terra_cidade ON terras(cidade);
CREATE INDEX IF NOT EXISTS idx_terra_estado ON terras(estado);

CREATE TABLE IF NOT EXISTS vinculo_comercial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  terra_id UUID NOT NULL REFERENCES terras(id),
  tipo_parceiro VARCHAR NOT NULL DEFAULT 'arrendador' CHECK (tipo_parceiro IN ('arrendador', 'fornecedor')),
  tipo_vinculo VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'encerrado')),
  modalidade_contrato VARCHAR,
  data_inicio DATE,
  data_fim DATE,
  observacoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_vinculo_parceiro ON vinculo_comercial(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_vinculo_terra ON vinculo_comercial(terra_id);
CREATE INDEX IF NOT EXISTS idx_vinculo_tipo_parceiro ON vinculo_comercial(tipo_parceiro);

CREATE TABLE IF NOT EXISTS parceiro_terra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  terra_id UUID NOT NULL REFERENCES terras(id),
  tipo_vinculo VARCHAR,
  UNIQUE (parceiro_id, terra_id)
);

CREATE TABLE IF NOT EXISTS terra_unidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terra_id UUID NOT NULL REFERENCES terras(id),
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  data_associacao DATE NOT NULL,
  UNIQUE (terra_id, unidade_id)
);

CREATE TABLE IF NOT EXISTS parceiro_unidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  data_associacao DATE NOT NULL,
  UNIQUE (parceiro_id, unidade_id)
);

CREATE TABLE IF NOT EXISTS usuario_unidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  data_associacao DATE NOT NULL,
  UNIQUE (usuario_id, unidade_id)
);

CREATE TABLE IF NOT EXISTS parceiro_coordenador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  observacoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_parceiro_coordenador_parceiro ON parceiro_coordenador(parceiro_id);

CREATE TABLE IF NOT EXISTS interacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  registrado_por UUID NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR NOT NULL,
  descricao TEXT NOT NULL,
  data DATE NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interacao_parceiro ON interacao(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_interacao_tipo ON interacao(tipo);

CREATE TABLE IF NOT EXISTS telefone_parceiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  numero VARCHAR NOT NULL,
  tipo VARCHAR CHECK (tipo IN ('celular', 'fixo', 'whatsapp')),
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP,
  criado_por UUID NOT NULL REFERENCES usuarios(id),
  atualizado_por UUID REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_telefone_parceiro ON telefone_parceiro(parceiro_id);

CREATE TABLE IF NOT EXISTS registro_alteracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  aprovado_por UUID REFERENCES usuarios(id),
  entidade_afetada VARCHAR NOT NULL,
  entidade_id UUID NOT NULL,
  tipo_operacao VARCHAR NOT NULL CHECK (tipo_operacao IN ('criacao', 'edicao', 'envio', 'aprovacao', 'devolucao', 'exclusao')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  status VARCHAR NOT NULL CHECK (status IN ('pendente', 'aprovado', 'devolvido')),
  comentario TEXT,
  data_solicitacao TIMESTAMP NOT NULL DEFAULT NOW(),
  data_aprovacao TIMESTAMP,
  data_alteracao TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registro_entidade ON registro_alteracao(entidade_afetada, entidade_id);
CREATE INDEX IF NOT EXISTS idx_registro_usuario ON registro_alteracao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registro_status ON registro_alteracao(status);
CREATE INDEX IF NOT EXISTS idx_registro_operacao ON registro_alteracao(tipo_operacao);
ALTER TABLE interacao ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'registrado';
