# Endpoint POST /api/usuarios

O endpoint `POST /api/usuarios` foi implementado para atender ao RF001, permitindo cadastrar usuários internos com perfil de acesso existente e e-mail único.

## Body

```json
{
  "nome": "Nome do usuário",
  "email": "usuario@empresa.com",
  "perfil_acesso_id": "uuid-do-perfil"
}
```

O usuário é criado ativo (`ativo = true`) e sem senha inicial (`senha_hash = NULL`), preservando o fluxo de primeiro acesso descrito no WAD.

## Implementação

O **Controller** (`criaUsuario`) recebe o body, delega ao service e responde `201 Created` com `Location: /api/usuarios/:id`.

O **Service** (`cadastraUsuario`) valida nome, e-mail e perfil; rejeita perfil inexistente; e impede e-mail duplicado antes de persistir.

O **Repository** (`criaUsuario`) insere em `usuarios` com `senha_hash = NULL`, `ativo = TRUE` e e-mail normalizado para minúsculas.

## Status codes

| Status | Quando |
| --- | --- |
| 201 | Usuário criado |
| 400 | Payload obrigatório inválido |
| 409 | E-mail já cadastrado |
| 422 | Perfil informado não existe |
| 500 | Erro inesperado |

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF001 | RN01/RN03 | `POST /api/usuarios` | criação ativa sem senha, e-mail duplicado, payload inválido, perfil inexistente |

Arquivo de testes: `src/tests/userCreateController.spec.ts`.
