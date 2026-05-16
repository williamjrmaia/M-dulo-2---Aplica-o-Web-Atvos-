-- =============================================================================
-- migration.sql
-- Banco de dados do sistema CRM ATVOS — PostgreSQL
-- Referência: WAD seção 3.6.3
-- =============================================================================

-- Pré-requisito: extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- Pré-requisito: tipo ENUM status_validacao
CREATE TYPE status_validacao AS ENUM (
  'rascunho', 'pendente', 'ativo', 'devolvido', 'inativo'
);


-- 01. perfil_acesso
CREATE TABLE perfil_acesso (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR NOT NULL UNIQUE
                CHECK (nome IN ('analista', 'coordenador', 'administrador')),
  requer_aprovacao BOOLEAN NOT NULL DEFAULT FALSE,
  descricao   TEXT
);


-- 02. usuarios
CREATE TABLE usuarios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_acesso_id  UUID NOT NULL REFERENCES perfil_acesso(id),
  nome              VARCHAR NOT NULL,
  email             VARCHAR NOT NULL UNIQUE,
  senha_hash        VARCHAR,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuario_perfil ON usuarios(perfil_acesso_id);
CREATE INDEX idx_usuario_nome ON usuarios(nome);


-- 03. unidades
CREATE TABLE unidades (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo  VARCHAR NOT NULL UNIQUE,
  nome    VARCHAR NOT NULL,
  ativo   BOOLEAN NOT NULL DEFAULT TRUE
);


-- 04. parceiros
CREATE TABLE parceiros (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             VARCHAR NOT NULL,
  apelido          VARCHAR,
  tipo_pessoa      VARCHAR NOT NULL
                     CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  cpf_cnpj         VARCHAR NOT NULL UNIQUE,
  email            VARCHAR,
  data_nascimento  DATE,
  nome_acompanhante VARCHAR,
  status           status_validacao NOT NULL DEFAULT 'rascunho',
  criado_em        TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMP,
  criado_por       UUID NOT NULL REFERENCES usuarios(id),
  atualizado_por   UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_parceiro_status   ON parceiros(status);
CREATE INDEX idx_parceiro_cpf_cnpj ON parceiros(cpf_cnpj);
CREATE INDEX idx_parceiro_nome ON parceiros(nome);
CREATE INDEX idx_parceiro_tipo_pessoa ON parceiros(tipo_pessoa);


-- 05. terras
CREATE TABLE terras (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               VARCHAR NOT NULL,
  area_contratada_ha DECIMAL(12,4) NOT NULL
                     CHECK (area_contratada_ha > 0),
  cidade             VARCHAR NOT NULL,
  estado             VARCHAR(2) NOT NULL,
  status             status_validacao NOT NULL DEFAULT 'rascunho',
  criado_em          TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em      TIMESTAMP,
  criado_por         UUID NOT NULL REFERENCES usuarios(id),
  atualizado_por     UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_terra_status ON terras(status);
CREATE INDEX idx_terra_cidade ON terras(cidade);
CREATE INDEX idx_terra_estado ON terras(estado);


-- 06. vinculo_comercial
CREATE TABLE vinculo_comercial (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id      UUID NOT NULL REFERENCES parceiros(id),
  terra_id         UUID NOT NULL REFERENCES terras(id),
  tipo_parceiro    VARCHAR NOT NULL DEFAULT 'arrendador'
                     CHECK (tipo_parceiro IN ('arrendador', 'fornecedor')),
  tipo_vinculo     VARCHAR NOT NULL,
  status           VARCHAR NOT NULL DEFAULT 'ativo'
                     CHECK (status IN ('ativo', 'inativo', 'encerrado')),
  modalidade_contrato VARCHAR,
  data_inicio      DATE,
  data_fim         DATE,
  observacoes      TEXT
);

CREATE INDEX idx_vinculo_parceiro         ON vinculo_comercial(parceiro_id);
CREATE INDEX idx_vinculo_terra            ON vinculo_comercial(terra_id);
CREATE INDEX idx_vinculo_tipo_parceiro    ON vinculo_comercial(tipo_parceiro);


-- 07. parceiro_terra
CREATE TABLE parceiro_terra (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  terra_id    UUID NOT NULL REFERENCES terras(id),
  tipo_vinculo VARCHAR,
  UNIQUE (parceiro_id, terra_id)
);


-- 08. terra_unidade
CREATE TABLE terra_unidade (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terra_id    UUID NOT NULL REFERENCES terras(id),
  unidade_id  UUID NOT NULL REFERENCES unidades(id),
  data_associacao DATE NOT NULL,
  UNIQUE (terra_id, unidade_id)
);


-- 09. parceiro_unidade
CREATE TABLE parceiro_unidade (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  unidade_id  UUID NOT NULL REFERENCES unidades(id),
  data_associacao DATE NOT NULL,
  UNIQUE (parceiro_id, unidade_id)
);


-- 10. usuario_unidade
CREATE TABLE usuario_unidade (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  unidade_id  UUID NOT NULL REFERENCES unidades(id),
  data_associacao DATE NOT NULL,
  UNIQUE (usuario_id, unidade_id)
);


-- 11. parceiro_coordenador
CREATE TABLE parceiro_coordenador (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  data_inicio DATE NOT NULL,
  data_fim    DATE,
  observacoes TEXT
);

CREATE INDEX idx_parceiro_coordenador_parceiro ON parceiro_coordenador(parceiro_id);


-- 12. interacao
CREATE TABLE interacao (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id   UUID NOT NULL REFERENCES parceiros(id),
  registrado_por UUID NOT NULL REFERENCES usuarios(id),
  tipo          VARCHAR NOT NULL,
  descricao     TEXT NOT NULL,
  data          DATE NOT NULL,
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interacao_parceiro ON interacao(parceiro_id);
CREATE INDEX idx_interacao_tipo     ON interacao(tipo);


-- 13. telefone_parceiro
CREATE TABLE telefone_parceiro (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID NOT NULL REFERENCES parceiros(id),
  numero      VARCHAR NOT NULL,
  tipo        VARCHAR CHECK (tipo IN ('celular', 'fixo', 'whatsapp')),
  principal   BOOLEAN NOT NULL DEFAULT FALSE,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP,
  criado_por  UUID NOT NULL REFERENCES usuarios(id),
  atualizado_por UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_telefone_parceiro ON telefone_parceiro(parceiro_id);


-- 14. registro_alteracao
CREATE TABLE registro_alteracao (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID NOT NULL REFERENCES usuarios(id),
  aprovado_por     UUID REFERENCES usuarios(id),
  entidade_afetada VARCHAR NOT NULL,
  entidade_id      UUID NOT NULL,
  tipo_operacao    VARCHAR NOT NULL
                     CHECK (tipo_operacao IN (
                       'criacao', 'edicao', 'envio',
                       'aprovacao', 'devolucao', 'exclusao'
                     )),
  dados_anteriores JSONB,
  dados_novos      JSONB,
  status           VARCHAR NOT NULL
                     CHECK (status IN ('pendente', 'aprovado', 'devolvido')),
  comentario       TEXT,
  data_solicitacao TIMESTAMP NOT NULL DEFAULT NOW(),
  data_aprovacao   TIMESTAMP,
  data_alteracao   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registro_entidade  ON registro_alteracao(entidade_afetada, entidade_id);
CREATE INDEX idx_registro_usuario   ON registro_alteracao(usuario_id);
CREATE INDEX idx_registro_status    ON registro_alteracao(status);
CREATE INDEX idx_registro_operacao    ON registro_alteracao(tipo_operacao);


