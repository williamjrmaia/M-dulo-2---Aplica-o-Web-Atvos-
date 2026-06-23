# Endpoint GET/POST /api/parceiros/:id/terras

O endpoint `GET/POST /api/parceiros/:id/terras` foi implementado para atender ao RF015, que exige associar múltiplas terras a um parceiro e múltiplos parceiros a uma mesma terra. O relacionamento é persistido na tabela associativa `parceiro_terra`, preservando o modelo N:N descrito pelas regras RN13 e RN14.

A rota segue a convenção atual do backend: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `/parceiros/:id/terras`, a rota exposta é `/api/parceiros/:id/terras`.

## Fluxo POST

O **Controller** (`vincularTerraAoParceiro`) valida o corpo com `vincularTerraAoParceiroSchema`. O payload exige `terra_id` como UUID válido e aceita `tipo_vinculo` opcional. Em caso de sucesso, responde `201 Created`, retorna o vínculo criado e define `Location: /api/parceiros/:id/terras/:terra_id`.

O **Service** (`vincularTerraAoParceiro`) traduz erros de banco para respostas HTTP de domínio: parceiro inexistente retorna 404, terra inexistente retorna 422 e vínculo duplicado retorna 409.

O **Repository** (`createParceiroTerra`) confirma a existência do parceiro e cria o registro na tabela `parceiro_terra` usando query parametrizada.

## Fluxo GET

O **Controller** (`listarTerrasDoParceiro`) delega ao service e retorna `200 OK` com um array de terras vinculadas.

O **Repository** (`listarTerrasDoParceiro`) consulta `parceiro_terra` com `JOIN` em `terras`, filtra terras com `status != 'inativo'` e ordena por `criado_em DESC`, mantendo a regra de exclusão lógica das listagens operacionais.

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF015 | RN13/RN14 | `POST /api/parceiros/:id/terras` | criação de vínculo, validação de payload, parceiro inexistente, terra inexistente, vínculo duplicado e persistência |
| RF015 | RN13/RN14 | `GET /api/parceiros/:id/terras` | listagem de terras vinculadas, parceiro inexistente e exclusão de terras inativas |

Arquivo de testes: `src/tests/parceiroTerraController.spec.ts`.
