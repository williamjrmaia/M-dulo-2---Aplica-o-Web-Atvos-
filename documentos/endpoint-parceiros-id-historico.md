# Endpoint GET /api/parceiros/:id/historico

O endpoint `GET /api/parceiros/:id/historico` foi implementado para atender ao RF013 e à RN12, permitindo consultar versões anteriores e alterações registradas para um parceiro.

A rota segue a convenção atual do backend: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `/parceiros/:id/historico`, a rota exposta é `/api/parceiros/:id/historico`.

## Implementação

O **Controller** (`listarHistoricoParceiro`) extrai o `id` da rota, delega ao service e responde `200 OK` com um array de registros.

O **Service** (`obterHistoricoParceiro`) diferencia parceiro inexistente de histórico vazio. Se o parceiro não existe ou o ID não é um UUID válido, retorna 404 com `Parceiro não encontrado`. Se o parceiro existe e não possui registros, retorna `200 []`.

O **Repository** (`listarHistoricoParceiro`) primeiro confirma a existência do parceiro e depois consulta `registro_alteracao` com:

- `entidade_id = :id`;
- `LOWER(entidade_afetada) IN ('parceiro', 'parceiros')`;
- ordenação por `data_alteracao DESC`.

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF013 | RN12 | `GET /api/parceiros/:id/historico` | ordem cronológica decrescente, filtro por entidade, histórico vazio, parceiro inexistente/ID inválido |

Arquivo de testes: `src/tests/parceiroHistoricoController.spec.ts`.
