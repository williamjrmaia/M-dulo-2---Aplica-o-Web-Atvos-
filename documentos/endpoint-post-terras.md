# Endpoint POST /api/terras

## 1. Justificativa

O endpoint `POST /api/terras` foi implementado para atender ao RF010, que exige a verificação de campos obrigatórios antes da persistência de um registro. Ele cria uma nova terra associada a um usuário responsável (`criado_por`), iniciando o registro com status `rascunho` conforme o ENUM `status_validacao`. Sem esse endpoint não seria possível alimentar a base de terras da ATVOS, que é a contraparte dos parceiros no domínio de Negócios Agrícolas e a base para os vínculos comerciais (RF015).

A validação do payload é feita com **zod** antes de qualquer acesso ao banco, garantindo a RN10 (campos obrigatórios não nulos). O registro de autoria e data (`criado_por`, `criado_em`) atende RF018 e RF019 (RN11), com `criado_em` preenchido pelo `DEFAULT NOW()` da tabela.

## 2. Fluxo Controller -> Service -> Repository -> banco

O **Controller** (`createTerra`) valida `req.body` com `createTerraSchema.safeParse`. Em caso de falha, lança `ValidationError` (400) com a lista de campos inválidos. Em sucesso, delega ao service e responde `201 Created` com o header `Location: /api/terras/:id` apontando para o recurso criado.

O **Service** (`cadastrarTerra`) chama o repository e traduz a violação de chave estrangeira do PostgreSQL (`23503`, quando `criado_por` não existe em `usuarios`) em `UnprocessableEntityError` (422), pois o payload é sintaticamente válido mas viola uma regra referencial de negócio.

O **Repository** (`createTerra`) executa um único `INSERT ... RETURNING *` com placeholders parametrizados (`$1..$6`), eliminando risco de SQL injection. O `status` usa `COALESCE($5::status_validacao, 'rascunho')` para respeitar o default quando não informado. Por ser uma operação de statement único, não há transação explícita.

## 3. Status codes

| Situação | Código |
|----------|--------|
| Terra criada | 201 Created (+ header `Location`) |
| Campo obrigatório ausente ou tipo/tamanho inválido (zod) | 400 |
| `criado_por` não referencia usuário existente (FK 23503) | 422 |
| Erro inesperado | 500 |

## 4. O que cada caso de teste verifica

### Caso 1 — Campos válidos
Caminho feliz: retorna 201, header `Location` no formato `/api/terras/<uuid>`, status inicial `rascunho`, `criado_em` presente e `area_contratada_ha` persistido.

### Caso 2 — nome ausente
Prova que o zod rejeita payload sem `nome`, retornando 400 com mensagem citando o campo.

### Caso 3 — area_contratada_ha não positiva
Prova que `area_contratada_ha = 0` é rejeitado (400), alinhado ao CHECK `area_contratada_ha > 0` da tabela e à regra `positive()` do schema.

### Caso 4 — estado inválido
Prova que `estado` com tamanho diferente de 2 é rejeitado (400), respeitando `VARCHAR(2)`.

### Caso 5 — criado_por inexistente
Prova que um UUID válido mas sem usuário correspondente gera violação de FK (`23503`) traduzida para 422.

### Caso 6 — Persistência
Lê a terra diretamente via `pool.query` após o POST, garantindo que o response reflete o estado real do banco.

## 5. Matriz de rastreabilidade

| RF    | RN   | Caso de Teste                                              | Arquivo                              |
|-------|------|-----------------------------------------------------------|--------------------------------------|
| RF010 | RN10 | campos válidos → 201, status rascunho, Location           | src/tests/terraController.spec.ts    |
| RF010 | RN10 | nome ausente → 400                                        | src/tests/terraController.spec.ts    |
| RF010 | RN10 | area_contratada_ha não positiva → 400                     | src/tests/terraController.spec.ts    |
| RF010 | RN10 | estado com tamanho inválido → 400                         | src/tests/terraController.spec.ts    |
| RF018/RF019 | RN11 | criado_por inexistente → 422                        | src/tests/terraController.spec.ts    |
| RF018/RF019 | RN11 | persistência confere com o banco                    | src/tests/terraController.spec.ts    |

## 6. Observação sobre a rota

O WAD (seção 3.1.4) lista o endpoint como `POST /terras`. Seguindo a convenção já adotada para parceiros (API JSON sob `/api/...`, views HTML sob `/...`), o endpoint JSON foi montado em `POST /api/terras`. A futura camada de views de terras usará `/terras`.
