# Endpoint PUT /api/parceiros/:id/aprovar

O endpoint `PUT /api/parceiros/:id/aprovar` foi implementado para atender ao RF022 e à RN17, permitindo que um parceiro em status `pendente` seja aprovado e passe para `ativo`.

A rota segue a convenção atual do backend: APIs JSON ficam sob `/api/...`. Por isso, embora o WAD cite `/parceiros/:id/aprovar`, a rota exposta é `/api/parceiros/:id/aprovar`.

## Body

```json
{
  "aprovado_por": "uuid-do-usuario",
  "comentario": "observação opcional"
}
```

`aprovado_por` é obrigatório e deve referenciar um usuário existente. `comentario` é opcional.

## Implementação

O **Controller** (`aprovarParceiro`) valida o body com `aprovarParceiroSchema`.

O **Service** (`aprovarParceiro`) aplica a regra de transição: apenas parceiros com status `pendente` podem ser aprovados. Parceiros inexistentes retornam 404; transições inválidas retornam 409; usuário inexistente em `aprovado_por` retorna 422.

O **Repository** (`approveParceiro`) executa a aprovação em transação, altera o parceiro para `ativo`, atualiza auditoria (`atualizado_por`, `atualizado_em`), marca registros pendentes do parceiro como `aprovado` e insere uma nova linha em `registro_alteracao` com `tipo_operacao = 'aprovacao'`.

## Testes cobertos

| RF | RN | Endpoint | Cobertura |
| --- | --- | --- | --- |
| RF022 | RN17 | `PUT /api/parceiros/:id/aprovar` | aprovação de parceiro pendente, aprovação sem registro prévio, rejeição de status não pendente, payload inválido/parceiro inexistente/usuário inexistente |

Arquivo de testes: `src/tests/parceiroAprovacaoController.spec.ts`.
