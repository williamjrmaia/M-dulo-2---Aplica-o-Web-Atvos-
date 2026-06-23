# Endpoint PUT /auth/sessoes/:id

O endpoint `PUT /auth/sessoes/:id` foi implementado para atender ao RF020, permitindo encerrar uma sessão autenticada e revogar seu acesso no banco.

## Implementação

O login continua retornando `token` JWT, mas agora também persiste uma linha em `auth_sessoes` e retorna:

```json
{
  "token": "jwt",
  "usuario": { "id": "...", "nome": "...", "email": "..." },
  "sessao": { "id": "...", "expira_em": "..." }
}
```

O **Controller** (`encerrarSessao`) recebe o `id` da sessão e delega ao service.

O **Service** (`encerrarSessao`) valida se a sessão existe e ainda está ativa. Sessão inexistente retorna 404; sessão já encerrada retorna 409; `revogada_por` apontando para usuário inexistente retorna 422.

O **Repository** (`AuthSessionRepository`) cria a tabela `auth_sessoes` se ela ainda não existir, persiste sessões no login e revoga sessões com `ativa = FALSE` e `revogada_em = NOW()`.

## Body opcional

```json
{
  "revogada_por": "uuid-do-usuario"
}
```

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF020 | RN15 | `PUT /auth/sessoes/:id` | revogação de sessão ativa, dupla revogação, sessão inexistente/ID inválido, usuário revogador inexistente |

Arquivo de testes: `src/tests/authSessionController.spec.ts`.
