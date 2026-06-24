# Endpoint GET /api/parceiros com filtros

O endpoint `GET /api/parceiros` foi estendido para atender ao RF007, RF012 e RF016, permitindo consultar parceiros não inativos com filtros combináveis por `nome`, `regiao`, `area` e `tipo`.

A rota segue a convenção atual do backend: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `/parceiros?nome=&regiao=&area=&tipo=`, a rota exposta é `/api/parceiros?nome=&regiao=&area=&tipo=`.

## Query params

| Parâmetro | Regra |
| --- | --- |
| `nome` | Busca parcial e case-insensitive em `nome` e `apelido` do parceiro |
| `regiao` | Busca parcial e case-insensitive em `cidade` ou `estado` das terras vinculadas ao parceiro |
| `area` | Filtra parceiros com ao menos uma terra vinculada com `area_contratada_ha >= area` |
| `tipo` | Aceita `fisica`, `juridica`, `arrendador` ou `fornecedor` |

## Implementação

O **Controller** (`listarParceiros`) valida os query params com `listarParceirosFiltrosSchema`. Parâmetros vazios são ignorados; `area` deve ser numérica e maior que zero; `tipo` deve estar nos valores permitidos.

O **Service** (`obterParceiros`) delega os filtros ao repository.

O **Repository** (`listarParceiros`) monta uma consulta parametrizada. A consulta sempre aplica `p.status != 'inativo'` e combina os filtros adicionais com `AND`. Os filtros de `regiao` e `area` usam `EXISTS` sobre `parceiro_terra` e `terras`; os tipos `arrendador` e `fornecedor` usam `vinculo_comercial`.

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF007/RF012/RF016 | RN04/RN08 | `GET /api/parceiros` | listagem sem filtros excluindo inativos, filtro por nome, combinação de região e área mínima, filtro por tipo comercial |

Arquivo de testes: `src/tests/parceiroFiltrosController.spec.ts`.
