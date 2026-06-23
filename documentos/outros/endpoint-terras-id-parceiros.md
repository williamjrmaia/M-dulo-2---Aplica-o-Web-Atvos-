# Endpoint GET/POST /api/terras/:id/parceiros

O endpoint `GET/POST /api/terras/:id/parceiros` foi implementado para atender ao RF015, permitindo associar múltiplos parceiros a uma mesma terra. A persistência usa a tabela associativa `parceiro_terra`, mantendo a relação N:N definida pelas regras RN13 e RN14.

A rota segue a convenção atual do backend: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `/terras/:id/parceiros`, a rota exposta é `/api/terras/:id/parceiros`.

## Fluxo POST

O **Controller** (`vincularParceiroATerra`) valida o corpo com `vincularParceiroATerraSchema`. O payload exige `parceiro_id` como UUID válido e aceita `tipo_vinculo` opcional. Em caso de sucesso, responde `201 Created`, retorna o vínculo criado e define `Location: /api/terras/:id/parceiros/:parceiro_id`.

O **Service** (`vincularParceiroATerra`) converte erros de banco para respostas HTTP de domínio: terra inexistente retorna 404, parceiro inexistente retorna 422 e vínculo duplicado retorna 409.

O **Repository** (`createTerraParceiro`) confirma a existência da terra e cria o registro na tabela `parceiro_terra` com query parametrizada.

## Fluxo GET

O **Controller** (`listarParceirosDaTerra`) delega ao service e retorna `200 OK` com um array de parceiros vinculados.

O **Repository** (`listarParceirosDaTerra`) consulta `parceiro_terra` com `JOIN` em `parceiros`, filtra parceiros com `status != 'inativo'` e ordena por `criado_em DESC`, respeitando a exclusão lógica nas consultas operacionais.

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF015 | RN13/RN14 | `POST /api/terras/:id/parceiros` | criação de vínculo, validação de payload, terra inexistente, parceiro inexistente, vínculo duplicado e persistência |
| RF015 | RN13/RN14 | `GET /api/terras/:id/parceiros` | listagem de parceiros vinculados, terra inexistente e exclusão de parceiros inativos |

Arquivo de testes: `src/tests/terraParceiroController.spec.ts`.
