# Endpoint PUT /api/terras/:id

## 1. Justificativa

O endpoint `PUT /api/terras/:id` foi implementado para atender aos RF010 e RF014, permitindo editar os dados cadastrais de uma terra e também alterar seu status para refletir inativação lógica quando necessário. A operação preserva o registro no banco, atualiza metadados de auditoria (`atualizado_por`, `atualizado_em`) e evita exclusão física.

A rota segue a convenção atual do backend: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `PUT /terras/:id`, a rota exposta é `PUT /api/terras/:id`.

## 2. Fluxo Controller -> Service -> Repository -> banco

O **Controller** (`updateTerra`) valida o body com `updateTerraSchema.safeParse`. Payload malformado, campo obrigatório ausente ou requisição sem campo editável retornam `400 Bad Request`.

O **Service** (`editarTerra`) chama o repository, traduz ausência de linha atualizada em `404 Not Found` e traduz violação de chave estrangeira (`23503`) em `422 Unprocessable Entity`, quando `atualizado_por` não referencia um usuário existente.

O **Repository** (`updateTerra`) monta dinamicamente o `UPDATE` apenas com os campos enviados, sempre incluindo `atualizado_por` e `atualizado_em = NOW()`, usando placeholders parametrizados. Como é um único statement, não há transação explícita.

## 3. Casos de teste

| Caso | O que verifica |
|---|---|
| 1 | Atualização válida retorna `200` e a terra atualizada |
| 2 | Body sem campo editável retorna `400` |
| 3 | Terra inexistente retorna `404` |
| 4 | `atualizado_por` ausente retorna `400` |
| 5 | `atualizado_por` inexistente retorna `422` |
| 6 | Dados persistidos conferem com o banco |

## 4. Rastreabilidade

| RF | RN | Endpoint | Arquivo de teste |
|---|---|---|---|
| RF010 | RN10 | `PUT /api/terras/:id` | `src/tests/terraController.spec.ts` |
| RF014 | RN07, RN08 | `PUT /api/terras/:id` | `src/tests/terraController.spec.ts` |
| RF018/RF019 | RN11 | `PUT /api/terras/:id` | `src/tests/terraController.spec.ts` |
