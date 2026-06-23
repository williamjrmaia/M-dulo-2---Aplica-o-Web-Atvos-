# Endpoint GET /api/parceiros

## 1. Justificativa

O endpoint `GET /api/parceiros` foi implementado para atender ao RF007, que exige que o sistema permita ao coordenador visualizar a lista de parceiros agricolas cadastrados. Este endpoint concentra a regra de negocio RN08, que determina que registros excluidos logicamente (status `inativo`) nao devem aparecer em consultas padrao do sistema. Sem esse endpoint, nenhum perfil de usuario poderia acessar a base de parceiros de forma estruturada, comprometendo a funcionalidade central do CRM: oferecer uma visao unica e confiavel dos parceiros agricolas da ATVOS.

A escolha de retornar apenas parceiros com status diferente de `inativo` e intencional e alinhada a RN08: a exclusao logica preserva o historico no banco sem expor registros descontinuados nas consultas operacionais do sistema.

## 2. Fluxo Controller -> Service -> Repository -> banco

O **Controller** (`listarParceiros`) nao extrai nenhum dado de `req.body` ou `req.params`, pois a listagem nao requer parametros. Delega diretamente ao service e devolve a lista com status 200.

O **Service** (`obterParceiros`) chama o repository sem nenhuma transformacao adicional. Por nao haver regras de negocio complexas alem da filtragem de inativos (que fica no repository por ser uma restricao estrutural da query), o service e intencionalmente simples.

O **Repository** (`listarParceiros`) executa um `SELECT * FROM parceiros WHERE status != 'inativo'`, filtrando registros inativados conforme a RN08. A query nao usa parametros externos, eliminando o risco de SQL injection.

O **banco** retorna todas as linhas com status diferente de `inativo`, na ordem de insercao padrao.

## 3. O que cada caso de teste verifica

### Caso 1 — Listagem com parceiros ativos
Prova que o caminho feliz funciona de ponta a ponta: apos criar um parceiro via POST, o GET retorna 200 com um array contendo o parceiro, com o campo `nome` correto.

### Caso 2 — Listagem vazia
Prova que o endpoint retorna 200 com array vazio quando nao ha parceiros cadastrados, sem erro ou comportamento inesperado.

### Caso 3 — Parceiro inativo nao aparece (RN08)
Prova que a regra de exclusao logica e aplicada no repository: um parceiro inserido diretamente no banco com status `inativo` nao aparece na listagem. O payload do POST nao aceita o campo `status`, entao a insercao e feita via `pool.query` para simular o estado correto.

### Caso 4 — Persistencia
Prova que os dados retornados pelo GET conferem com o que esta salvo no banco, lendo diretamente via `pool.query` apos a requisicao. Garante que o response nao e fabricado e reflete o estado real do banco.

## 4. Matriz de rastreabilidade

| RF    | RN    | Caso de Teste                                                                                  | Arquivo                                        | Evidencia      |
|-------|-------|-----------------------------------------------------------------------------------------------|------------------------------------------------|----------------|
| RF007 | RN08  | deve retornar a lista de parceiros ativos cadastrados                                         | src/test/parceiroController.get.spec.ts        | ✓ (2399 ms)    |
| RF007 | RN08  | deve retornar array vazio quando nao ha parceiros                                             | src/test/parceiroController.get.spec.ts        | ✓ (1161 ms)    |
| RF007 | RN08  | nao deve incluir parceiros com status inativo na listagem (RN08)                              | src/test/parceiroController.get.spec.ts        | ✓ (4733 ms)    |
| RF007 | RN08  | deve retornar dados que conferem com o que esta salvo no banco                                | src/test/parceiroController.get.spec.ts        | ✓ (1552 ms)    |
