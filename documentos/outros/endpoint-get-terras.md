# Endpoint GET /api/terras

## 1. Justificativa

O endpoint `GET /api/terras` foi implementado para atender ao RF012, que exige que consultas padrao nao exibam registros excluidos logicamente. No dominio do Safra Control, terras com `status = 'inativo'` devem continuar preservadas no banco para rastreabilidade, mas nao podem aparecer na listagem operacional usada pelos usuarios.

A rota segue a mesma convencao adotada no backend atual: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `GET /terras`, o endpoint exposto pela aplicacao e `GET /api/terras`.

## 2. Fluxo Controller -> Service -> Repository -> banco

O **Controller** (`listarTerras`) nao recebe parametros. Ele chama o service e retorna `200 OK` com um array JSON.

O **Service** (`obterTerras`) delega ao repository. A regra relevante e estrutural da consulta: excluir registros inativos.

O **Repository** (`listarTerras`) executa:

```sql
SELECT *
  FROM terras
 WHERE status != 'inativo'
 ORDER BY criado_em DESC
```

Como nao ha entrada externa na query, nao ha risco de injecao por parametro. Tambem nao ha transacao explicita porque a operacao e apenas leitura.

## 3. Casos de teste

| Caso | O que verifica |
|---|---|
| 1 | Listagem retorna `200` com terras cadastradas e nao inativas |
| 2 | Listagem vazia retorna `200` com `[]` |
| 3 | Terra com `status = 'inativo'` nao aparece na consulta padrao |
| 4 | Dados retornados conferem com o que esta salvo no banco |

## 4. Rastreabilidade

| RF | RN | Endpoint | Arquivo de teste |
|---|---|---|---|
| RF012 | RN07, RN08 | `GET /api/terras` | `src/tests/terraController.spec.ts` |
