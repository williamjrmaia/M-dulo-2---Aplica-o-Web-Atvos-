# Prompt para Codex no VS Code - Fluxo 04

Atue como um desenvolvedor backend senior especializado em Node.js, TypeScript, Express, PostgreSQL e Arquitetura Limpa no padrao MVC + Service + Repository.

Implemente o fluxo do diagrama de sequencia "Fluxo 04 - Inativa Usuario", seguindo a modelagem atual do projeto e usando o repositorio de aulas MVC como referencia de organizacao por `controllers`, `models`, `routes`, `services` e camada de banco.

Requisitos do fluxo:

- Endpoint principal: `PUT /usuarios/:id/inativar`
- Validar autorizacao de administrador antes de chamar o service
- Token ausente ou invalido: retornar `401 Unauthorized`
- Usuario autenticado sem perfil administrador: retornar `403 Forbidden`
- Buscar usuario por id antes de inativar
- Se o usuario nao existir, retornar `404 Not Found`
- Persistir inativacao logica com SQL parametrizado: `UPDATE usuarios SET ativo = FALSE WHERE id = $1`
- Se ocorrer falha tecnica no banco, retornar `500 Internal Server Error`
- Em sucesso, retornar `200 OK` com mensagem `Acesso revogado e historico preservado`

Padroes obrigatorios:

1. Criar testes `.spec.ts` com Triple A antes/junto da implementacao.
2. Isolar controller e service com mocks `jest.fn()`.
3. Definir interfaces TypeScript de models e DTOs usando `Omit` ou `Partial<Pick<...>>` quando aplicavel.
4. Service recebe repository no construtor e concentra regras de negocio.
5. Controller gerencia `req` e `res`; views EJS usam `res.render`; formulario bem-sucedido usa `res.redirect`.
6. Rotas instanciam dependencias de baixo para cima: Repository -> Service -> Controller.
7. Inserir `console.log` nas camadas Rota -> Controller -> Service -> Repository.
8. Evitar alterar arquivos que nao afetem diretamente o fluxo.
