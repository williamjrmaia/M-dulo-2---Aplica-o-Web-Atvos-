# Endpoint PUT /api/parceiros/:id/devolver

O endpoint `PUT /api/parceiros/:id/devolver` foi implementado para atender ao RF023 e à RN17, permitindo que um parceiro em status `pendente` seja devolvido para ajustes e passe para `devolvido`.

A rota segue a convenção atual do backend: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `/parceiros/:id/devolver`, a rota exposta é `/api/parceiros/:id/devolver`.

## Body

```json
{
  "devolvido_por": "uuid-do-usuario",
  "comentario": "observação opcional"
}
```

`devolvido_por` é obrigatório e deve referenciar um usuário existente. `comentario` é opcional.

## Implementação

O **Controller** (`devolverParceiro`) valida o body com `devolverParceiroSchema`.

O **Service** (`devolverParceiro`) aplica a regra de transição: apenas parceiros com status `pendente` podem ser devolvidos. Parceiros inexistentes retornam 404; transições inválidas retornam 409; usuário inexistente em `devolvido_por` retorna 422.

O **Repository** (`returnParceiroForAdjustment`) executa a devolução em transação, altera o parceiro para `devolvido`, atualiza auditoria (`atualizado_por`, `atualizado_em`), marca registros pendentes do parceiro como `devolvido` e insere uma nova linha em `registro_alteracao` com `tipo_operacao = 'devolucao'`.

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF023 | RN17 | `PUT /api/parceiros/:id/devolver` | devolução de parceiro pendente, devolução sem registro prévio, rejeição de status não pendente, payload inválido/parceiro inexistente/usuário inexistente |

Arquivo de testes: `src/tests/parceiroDevolucaoController.spec.ts`.
