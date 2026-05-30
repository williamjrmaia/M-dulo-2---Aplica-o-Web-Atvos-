# Endpoint GET /api/parceiros/:id

## 1. Justificativa

O endpoint `GET /api/parceiros/:id` foi implementado para atender ao RF008, que exige que o sistema permita consultar o perfil detalhado de um parceiro agricola especifico. Este endpoint e o ponto central do fluxo de visualizacao individual: sem ele, o observador e o analista so teriam acesso a lista geral, sem conseguir ver os dados completos de um parceiro especifico para embasar decisoes de negocio.

A regra de negocio principal aplicada e a RN08: registros com status `inativo` nao devem aparecer em consultas do sistema. Ao buscar por ID, se o parceiro existir mas estiver inativo, o sistema retorna 404, tratando o registro como inexistente para fins operacionais. Isso preserva a exclusao logica sem expor dados descontinuados.

A escolha de retornar 404 tanto para IDs inexistentes quanto para IDs com formato invalido e intencional: expor diferencas entre "nao existe" e "formato errado" poderia revelar informacoes sobre a estrutura interna do banco para agentes mal-intencionados.

## 2. Fluxo Controller -> Service -> Repository -> banco

O **Controller** (`obterParceiroPorId`) extrai o `id` de `req.params.id` e delega diretamente ao service. Nao ha validacao de contrato alem da extracao do parametro, pois qualquer string e aceita como ID e o tratamento de formato invalido acontece na camada de service.

O **Service** (`obterParceiroPorId`) chama o repository e aplica duas regras: se o resultado for `null` (ID nao encontrado), lanca `NotFoundError`; se o banco retornar erro de formato UUID invalido (codigo PostgreSQL `22P02`), tambem lanca `NotFoundError`. Essa traducao centraliza o tratamento de erro no lugar certo, sem vazar detalhes do banco para o cliente.

O **Repository** (`getParceiroById`) executa `SELECT * FROM parceiros WHERE id = $1 AND status != 'inativo'` com query parametrizada, eliminando risco de SQL injection. Retorna o primeiro resultado ou `null` se nenhuma linha for encontrada ou se o parceiro estiver inativo.

O **banco** executa a busca pelo UUID informado e retorna a linha completa ou conjunto vazio. Se o valor nao for UUID valido, o PostgreSQL lanca erro com codigo `22P02`, que o service intercepta.

## 3. O que cada caso de teste verifica

### Caso 1 — Sucesso
Prova que o caminho feliz funciona de ponta a ponta: apos criar um parceiro via POST, o GET /:id com o ID retornado pelo POST devolve 200 com os dados corretos, incluindo nome, tipo_pessoa e cpf_cnpj.

### Caso 2 — Parceiro nao encontrado (RN08)
Prova que ao informar um UUID valido que nao existe no banco, o sistema retorna 404 com mensagem `Parceiro nao encontrado`. O service aplica essa regra ao receber `null` do repository.

### Caso 3 — ID com formato invalido
Prova que ao informar uma string que nao e UUID valido (ex: `invalid-uuid`), o sistema retorna 404 em vez de 500. O service intercepta o erro PostgreSQL `22P02` e o traduz em `NotFoundError`, protegendo o cliente de detalhes internos do banco.

### Caso 4 — Persistencia
Prova que os dados retornados pelo GET /:id conferem com o que esta salvo no banco, lendo diretamente via `pool.query` apos a requisicao. Garante que o response nao e fabricado e reflete o estado real do banco.

## 4. Matriz de rastreabilidade

| RF    | RN    | Caso de Teste                                                                                              | Arquivo                                        | Evidencia      |
|-------|-------|------------------------------------------------------------------------------------------------------------|------------------------------------------------|----------------|
| RF008 | RN08  | deve retornar os dados do parceiro correspondente ao ID informado                                         | src/tests/parceiroDetalheController.spec.ts    | ✓              |
| RF008 | RN08  | deve retornar 404 quando nenhum parceiro corresponde ao ID informado                                      | src/tests/parceiroDetalheController.spec.ts    | ✓              |
| RF008 | RN08  | deve retornar 404 quando o ID informado nao tem formato de UUID valido                                    | src/tests/parceiroDetalheController.spec.ts    | ✓              |
| RF008 | RN08  | deve retornar 404 quando o parceiro esta inativo                                                         | src/tests/parceiroDetalheController.spec.ts    | ✓              |
