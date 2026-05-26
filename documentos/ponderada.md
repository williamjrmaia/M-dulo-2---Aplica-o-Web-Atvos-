# Ponderada de Integração de Backend

## Fluxo escolhido: POST /api/parceiros

---

## (a) Justificativa

O endpoint POST /api/parceiros é o mais crítico do sistema porque concentra o maior numero de regras de negocio obrigatorias em um unico ponto de entrada. Nenhum outro endpoint exige simultaneamente validacao de contrato (RN10), unicidade de identificador fiscal no banco (RN09), registro automatico de metadados de auditoria (RN11) e restricao por perfil de acesso (RN04). Isso significa que qualquer falha nesse fluxo compromete a integridade de todo o cadastro de parceiros, pois e aqui que os dados entram pela primeira vez no sistema. Os demais endpoints (GET, PATCH) operam sobre registros ja existentes e dependem que esse fluxo tenha funcionado corretamente. Por essa razao, cobrir esse endpoint com casos de sucesso, violacao de regra de negocio, rejeicao de contrato e verificacao de persistencia fornece a maior garantia de qualidade com o menor numero de testes.

---

## (b) Caminho Controller → Service → Repository → banco

**1. Controller (`parceiroController.ts`)**

Recebe a requisicao HTTP e extrai os campos do `req.body`. Antes de chamar qualquer outra camada, valida o contrato: verifica se os campos obrigatorios (`nome`, `tipo_pessoa`, `cpf_cnpj`, `criado_por`) estao presentes e se `tipo_pessoa` pertence ao ENUM `['fisica', 'juridica']`. Se o contrato for violado, lanca um `ValidationError` que o middleware de erro converte em 400 sem tocar no banco. Se o contrato for valido, delega para o Service.

**2. Service (`parceiroService.ts`)**

Recebe os dados ja validados e chama o Repository dentro de um bloco try/catch. Sua unica responsabilidade e tratar erros de dominio: se o PostgreSQL retornar o codigo `23505` (violacao de constraint UNIQUE), captura a excecao e lanca um `ConflictError('cpf_cnpj já cadastrado')`, que o middleware converte em 409. Qualquer outro erro e relancado sem tratamento. Nao contem logica de negocio alem dessa traducao de erro.

**3. Repository (`parceiroRepository.ts`)**

Executa o `INSERT INTO parceiros ... RETURNING *` diretamente via `pool.query`. Nao conhece regras de negocio nem erros HTTP. Devolve a linha inserida (com `id`, `status` e `criado_em` preenchidos pelo banco) ou lanca a excecao do driver `pg` em caso de falha de constraint.

**4. Banco (PostgreSQL)**

Aplica as constraints definidas no schema: UNIQUE em `cpf_cnpj`, CHECK em `tipo_pessoa`, DEFAULT `'rascunho'` em `status` e `NOW()` em `criado_em`. E o banco que garante atomicidade e integridade; o codigo apenas prepara os dados e interpreta os erros.

---

## (c) O que cada caso de teste verifica

| Caso | Nome do teste | O que verifica |
|------|---------------|----------------|
| 1 | deve cadastrar parceiro com campos mínimos válidos, retornando status 201 e status rascunho (RN11) | Caminho feliz completo: resposta 201, campos do body batem com o enviado, `status` e `'rascunho'` definido pelo DEFAULT do banco, `criado_por` e `criado_em` presentes |
| 2 | deve rejeitar cadastro de parceiro com CPF/CNPJ já existente, garantindo unicidade no banco (RN09) | Violacao de dominio: insere dois parceiros com o mesmo `cpf_cnpj`; espera 409 e mensagem de erro contendo `cpf_cnpj` |
| 3 | deve rejeitar payload com tipo_pessoa fora do ENUM, retornando 400 (RN10) | Falha de contrato: envia `tipo_pessoa: 'empresa'` (fora do ENUM); espera 400 e mensagem de erro contendo `tipo_pessoa`, sem chegar ao banco |
| 4 | deve persistir o parceiro no banco com status rascunho e criado_por correto (RN11) | Persistencia real: apos 201, executa SELECT direto no banco e confirma `status`, `criado_por` e `cpf_cnpj` gravados corretamente |
