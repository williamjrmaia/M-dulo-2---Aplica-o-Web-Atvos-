# Endpoint PATCH /api/parceiros/:id

## 1. Justificativa

O endpoint `PATCH /api/parceiros/:id` foi implementado para atender ao RF005, que exige que o sistema permita a edição de dados cadastrais de parceiros agricolas existentes. Este endpoint concentra tres regras de negocio criticas: unicidade de CPF/CNPJ e e-mail entre parceiros (RN09), registro obrigatorio de auditoria a cada alteracao com data, hora e usuario responsavel (RN11), e rejeicao de tentativas de edicao em registros inexistentes (RN19). Sem esse endpoint, nenhum dado cadastral de parceiro poderia ser corrigido ou atualizado apos o cadastro inicial, comprometendo a integridade e a continuidade das informacoes no CRM da ATVOS.

O metodo PATCH foi escolhido em vez do PUT porque o sistema permite atualizacao parcial: o usuario pode alterar apenas os campos necessarios sem precisar reenviar todos os dados do parceiro. A matriz de requisitos funcionais (secao 3.1.4 do WAD) deve ser atualizada para refletir PATCH em vez de PUT para o RF005.

## 2. Fluxo Controller -> Service -> Repository -> banco

O **Controller** (`editarParceiro`) extrai o `id` de `req.params` e os campos editaveis de `req.body`, valida o contrato da API (presenca de `atualizado_por` e pelo menos um campo editavel), e delega ao service.

O **Service** (`editarParceiro`) chama o repository, verifica se o resultado e null (parceiro nao encontrado, lancando `NotFoundError` com 404), e intercepta o erro PostgreSQL 23505 (violacao de UNIQUE), traduzindo-o em `ConflictError` com 409.

O **Repository** (`updateParceiro`) monta dinamicamente a query UPDATE com apenas os campos que vieram no body, sempre incluindo `atualizado_por` e `atualizado_em = NOW()`, e executa com parametros separados para prevenir SQL injection. Retorna `null` se nenhuma linha foi afetada.

O **banco** aplica as restricoes de unicidade (UNIQUE em cpf_cnpj e email), atualiza `atualizado_em` via `NOW()`, e retorna a linha completa via `RETURNING *`.

## 3. O que cada caso de teste verifica

### Caso 1 — Sucesso
Prova que o caminho feliz funciona de ponta a ponta: requisicao valida com pelo menos um campo editavel e `atualizado_por` presente resulta em 200, com o campo alterado e o `atualizado_por` gravados corretamente no response.

### Caso 2 — Unicidade violada (RN09)
Prova que a regra de unicidade de CPF/CNPJ e aplicada no service via interceptacao do codigo PostgreSQL 23505, devolvendo 409 Conflict. O payload esta bem formado, mas viola uma regra de dominio.

### Caso 3 — Contrato quebrado
Prova que o controller rejeita um body sem nenhum campo editavel (apenas `atualizado_por`) com 400 Bad Request, sem nem chegar ao service ou ao banco.

### Caso 4 — Persistencia
Prova que o registro foi realmente gravado no banco lendo diretamente via `pool.query` apos o PATCH. Garante que o controller nao respondeu 200 sem ter de fato persistido a alteracao.

## 4. Matriz de rastreabilidade

| RF    | RN    | Caso de Teste                                                                                              | Arquivo                                          | Evidencia   |
|-------|-------|------------------------------------------------------------------------------------------------------------|--------------------------------------------------|-------------|
| RF005 | RN11  | deve atualizar os dados do parceiro e retornar o registro atualizado com status 200                        | src/test/parceiroController.patch.spec.ts        | ✓ (3948 ms)  |
| RF005 | RN09  | deve rejeitar atualizacao com cpf_cnpj ja cadastrado em outro parceiro, garantindo unicidade (RN09)        | src/test/parceiroController.patch.spec.ts        | ✓ (2200 ms)  |
| RF005 | RN19  | deve rejeitar atualizacao sem campos editaveis, garantindo que pelo menos um campo seja fornecido (RN19)   | src/test/parceiroController.patch.spec.ts        | ✓ (2522 ms)  |
| RF005 | RN11  | deve constar o parceiro atualizado no banco de dados, garantindo persistencia                              | src/test/parceiroController.patch.spec.ts        | ✓ (5160 ms)  |
