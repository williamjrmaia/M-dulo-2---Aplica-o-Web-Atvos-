# Endpoint PUT /api/parceiros/:id/validacao

O endpoint `PUT /api/parceiros/:id/validacao` foi implementado para atender ao RF021 e à RN16, permitindo enviar um parceiro em `rascunho` ou `devolvido` para validação de um coordenador.

A rota segue a convenção atual do backend: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `/parceiros/:id/validacao`, a rota exposta é `/api/parceiros/:id/validacao`.

## Body

```json
{
  "atualizado_por": "uuid-do-usuario",
  "comentario": "observação opcional"
}
```

`atualizado_por` é obrigatório e deve referenciar um usuário existente. `comentario` é opcional.

## Implementação

O **Controller** (`enviarParceiroParaValidacao`) valida o body com `enviarParceiroValidacaoSchema`.

O **Service** (`enviarParceiroParaValidacao`) aplica a regra de transição: apenas parceiros com status `rascunho` ou `devolvido` podem ir para `pendente`. Parceiros inexistentes retornam 404; transições inválidas retornam 409; usuário inexistente em `atualizado_por` retorna 422.

O **Repository** (`sendParceiroToValidation`) executa a atualização em transação, muda o status para `pendente`, atualiza auditoria (`atualizado_por`, `atualizado_em`) e registra a operação `envio` em `registro_alteracao` com `status = 'pendente'`.

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF021 | RN16 | `PUT /api/parceiros/:id/validacao` | envio de rascunho, reenvio de devolvido, rejeição de status ativo/pendente, payload inválido/parceiro inexistente/usuário inexistente |

Arquivo de testes: `src/tests/parceiroValidacaoController.spec.ts`.
