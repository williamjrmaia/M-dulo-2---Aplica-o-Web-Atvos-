# Matriz RF → RN → Teste

## Fluxo escolhido: Cadastro de Parceiro (POST /api/parceiros)

### Justificativa de escolha

Eu escolhi o fluxo de cadastro de parceiro por concentrar o maior numero de regras de negocio obrigatorias em um unico endpoint, ou seja, mais prioritário. Ele envolve validacao de payload -> (RN10), unicidade de CPF/CNPJ -> (RN09), registro automatico de metadados -> (RN11) e restricao de perfil de acesso -> (RN04), o que permite cobrir cenarios de sucesso, violacao de regra de negocio, payload invalido e persistencia real no banco em apenas 4 casos de teste.

---

## Matriz

| RF | RN | Caso de Teste | Arquivo | Status |
|---|---|---|---|---|
| RF004 | RN11 | POST /parceiros com campos minimos validos → 201, status='rascunho', criado_em presente | src/controllers/parceiroController.spec.ts | passou com sucesso: ✓ Caso 1 — campos mínimos válidos → 201, status rascunho, criado_em presente (2312 ms) |
| RF009 | RN09 | POST /parceiros com cpf_cnpj ja existente no banco → 409 Conflict | src/controllers/parceiroController.spec.ts | passou com sucesso:  ✓ Caso 2 — RN09: cpf_cnpj duplicado → 409 (1376 ms) |
| RF010 | RN10 | POST /parceiros com tipo_pessoa invalido ('empresa') → 400 Bad Request | src/controllers/parceiroController.spec.ts | passou com sucesso: Caso 3 — payload inválido: tipo_pessoa fora do ENUM → 400 (1764 ms) |
| RF018/RF019 | RN11 | Apos POST 201, SELECT direto no banco confirma status='rascunho' e criado_por correto | src/controllers/parceiroController.spec.ts | passou com sucesso: ✓ Caso 4 — persistência: SELECT confirma status rascunho e criado_por correto (1391 ms)|

---

## Detalhamento dos casos

### Caso 1 — Sucesso (RF004)
Envia os 4 campos minimos obrigatorios. Espera status 201, `status='rascunho'` definido pelo DEFAULT do banco, e `criado_em` preenchido automaticamente.

### Caso 2 — RN09 violada (RF009)
Insere um parceiro com `cpf_cnpj = '11111111111'`, depois tenta inserir outro com o mesmo CPF. O PostgreSQL lanca erro de constraint UNIQUE (codigo 23505), o Service converte em ConflictError e o endpoint retorna 409.

### Caso 3 — Payload invalido (RF010 / RN10)
Envia `tipo_pessoa: 'empresa'`, que nao pertence ao ENUM `['fisica', 'juridica']`. O Controller rejeita antes de chamar o Service e retorna 400.

### Caso 4 — Verificacao de persistencia (RF018/RF019 / RN11)
Apos receber 201, executa `SELECT * FROM parceiros WHERE id = $1` diretamente via pool e confirma que os dados foram gravados corretamente no banco real. Prova que a persistencia ocorreu de fato, sem depender apenas da resposta da API.
