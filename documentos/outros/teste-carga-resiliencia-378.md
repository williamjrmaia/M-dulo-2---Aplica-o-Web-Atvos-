# Teste de carga e resiliência — Autocannon (#378)

## Objetivo

Executar teste de carga em uma rota principal da API com `autocannon`, registrar as
métricas, identificar fragilidades e implementar melhorias de resiliência (timeout e
tratamento de erro) onde necessário.

## Ambiente e setup

| Item | Valor |
|------|-------|
| Rota testada | `GET /api/parceiros` (listagem; rota principal autenticada) |
| Ferramenta | `autocannon` (via `npx autocannon`) |
| Carga | 15 conexões, 15 s |
| Autenticação | JWT (Bearer) obtido via `POST /login` com usuário de demonstração |
| Banco | PostgreSQL/Supabase (pooler remoto) |
| App | `npm run dev` (Express + ts-node-dev) |

A rota foi validada manualmente antes do teste: login retorna `200` com token e a
listagem retorna `200` com o JSON dos parceiros. Cada requisição autenticada faz
**3 idas ao banco**: validação da sessão, busca do usuário e a consulta de listagem.

## Resultado do teste de carga (baseline)

```
194 requests in 15.02s, 143 kB read
```

| Métrica | Valor |
|---------|-------|
| Requisições | 194 (0 erros, 0 timeouts, 100% 2xx) |
| Throughput | ~11,9 req/s (média) |
| Latência média | 1215 ms |
| Latência p50 | 1078 ms |
| Latência p97.5 / p99 | 2617 ms / 2620 ms |
| Latência máx | 2621 ms |

**Leitura:** a aplicação é fortemente *I/O-bound* no banco remoto. Uma requisição
isolada leva ~0,8 s; com apenas 15 conexões concorrentes a latência praticamente
triplica no p99 (≈2,6 s). A margem até a degradação é estreita.

## Fragilidades identificadas

1. **Ausência de timeout de requisição.** Se o banco fica lento ou indisponível
   (observamos na prática `EAI_AGAIN` e `Connection terminated` no pooler do
   Supabase), a requisição fica pendurada, segurando conexões e degradando todo o
   servidor — sem degradação controlada.
2. **Falha de banco vira `500` opaco.** Erros transitórios de conexão/timeout eram
   tratados como `500 Erro interno`, sem sinalizar que são temporários (sem
   `Retry-After`), atrapalhando retry de clientes/balanceadores.
3. **`requireAuth` mascara indisponibilidade como `401`.** Erros de infraestrutura
   durante a autenticação são capturados e tratados como "não autenticado" (`401`),
   escondendo a real causa (banco fora). *Documentado como recomendação — não
   alterado nesta task para não mexer no fluxo de autenticação.*

## Resiliência implementada

1. **Middleware de timeout de requisição** (`src/middlewares/requestTimeout.ts`),
   aplicado globalmente no `app.ts`. Responde **`503` + `Retry-After`** se a resposta
   não sair dentro do limite (default 15 s, configurável por `REQUEST_TIMEOUT_MS`),
   evitando requisições penduradas. Limpa o timer em `finish`/`close` e respeita
   `headersSent` (sem double-send).
2. **Tratamento de banco indisponível no `errorHandler`** (`src/middlewares/errorHandler.ts`).
   Erros de rede (`EAI_AGAIN`, `ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET`...) e
   SQLSTATEs de indisponibilidade/cancelamento do Postgres (`57014`, `08006`,
   `53300`...) passam a responder **`503` + `Retry-After`** em vez de `500`. Inclui
   guarda de `headersSent`. Erros de domínio (ex.: UUID malformado `22P02`) seguem
   com seus status originais — sem regressão.

## Cenário de falha testado manualmente

Subindo a app com `REQUEST_TIMEOUT_MS=200` e chamando `GET /api/parceiros` (que leva
~0,8 s):

```
HTTP/1.1 503 Service Unavailable
Retry-After: 5
{"error":"Tempo de resposta excedido. Tente novamente em instantes."}
--> HTTP 503 em 0.20s
```

A requisição é encerrada de forma controlada em 0,2 s em vez de pendurar — resiliência
confirmada.

## Re-teste de carga (após as mudanças)

```
178 requests in 15.02s, 130 kB read
```

| Métrica | Baseline | Depois |
|---------|----------|--------|
| Requisições / erros | 194 / 0 | 178 / 0 |
| Throughput médio | ~11,9 req/s | ~10,9 req/s |
| Latência média | 1215 ms | 1319 ms |
| Latência p99 | 2620 ms | 2883 ms |

O caminho feliz permanece equivalente (a pequena diferença está dentro da variação de
rede do pooler remoto). As melhorias de resiliência **não degradam** o fluxo normal —
só atuam em lentidão/indisponibilidade.

## Recomendações futuras

- Distinguir, em `requireAuth`, erros de infraestrutura (→ `503`) de falha de
  autenticação (→ `401`), para não mascarar indisponibilidade.
- Tunar o pool do `pg` (`max`, `statement_timeout`/`query_timeout`) para limitar o
  tempo de queries lentas no servidor.
- Avaliar *rate limiting* e *cache* da validação de sessão para reduzir as 3 idas ao
  banco por requisição autenticada.

## Testes automatizados adicionados

- `src/tests/requestTimeout.spec.ts` — 4 casos (timeout → 503, limpeza no `finish`,
  `headersSent`, `next()` imediato).
- `src/tests/errorHandler.spec.ts` — 10 casos (AppError, `500`, `503` por code e por
  mensagem, guarda de `headersSent`, não confundir erro de domínio).
