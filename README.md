# Safra Control

Sistema web de CRM agrícola desenvolvido para a ATVOS no Módulo 2 do Inteli. A aplicação centraliza o cadastro e o relacionamento com fornecedores de cana-de-açúcar e proprietários cedentes, preservando histórico, responsáveis pelas alterações e vínculos com terras.

## Integrantes

- Antonio de Souza Dantas Neto
- Gabriel Gomes Pimentel
- Haila Thauane Falcão Novaes
- João Paulo Barreto Ferreira Andrade Rodrigues de Paula
- Mariana Pires de Carvalho Moussa
- Tiago Brun de Arruda
- William Junior dos Santos Maia

## Estado da versão

A segunda versão web está implementada com frontend renderizado no servidor e integração com o backend. Estão disponíveis autenticação, gestão de usuários, parceiros, terras, validação de parceiros, histórico, interações, vínculos e exportação CSV.

Permanecem fora do escopo desta versão o upload de arquivos e a rotina automática de notificação de registros sem atualização. O dashboard de interações está disponível como resposta JSON, sem uma tela EJS específica.

## Stack técnica

- TypeScript e Node.js;
- Express 5;
- EJS, CSS e JavaScript próprios;
- PostgreSQL ou Supabase;
- Zod para validação de entrada;
- JWT e sessões persistidas para autenticação;
- Jest e Supertest para testes automatizados.

## Funcionalidades

- Login, logout e proteção de rotas por perfil;
- primeiro acesso e definição de senha;
- cadastro, listagem, edição, detalhe e inativação lógica de parceiros;
- filtros de parceiros por nome, tipo, status, região, usina e dados agrícolas;
- envio para validação, aprovação e devolução com comentário;
- cadastro, edição, listagem e inativação lógica de terras;
- vínculos muitos-para-muitos entre parceiros e terras;
- histórico de alterações e registro de interações;
- cadastro, edição, alteração de perfil e inativação de usuários;
- revogação das sessões de usuários inativados;
- exportação CSV de parceiros;
- métricas agregadas de interações.

## Perfis de acesso

| Perfil | Responsabilidades principais |
|---|---|
| `analista` | Cadastrar e editar rascunhos, consultar registros e enviar parceiros para validação. |
| `coordenador` | Consultar registros e revisar, aprovar ou devolver parceiros pendentes. |
| `administrador` | Administrar usuários e executar operações de gestão em todos os módulos. |

As permissões são verificadas no backend pelos middlewares de autenticação e autorização. A ocultação de elementos na interface não é usada como única barreira de acesso.

## Estrutura principal

```text
g06/
├── documentos/              # WAD, documentação de endpoints e evidências
├── public/
│   ├── css/atvos.css        # Estilos da interface
│   ├── js/app.js            # Busca, máscaras, modais e feedbacks
│   └── docs/                # Documentação estática gerada
├── src/
│   ├── config/              # Banco e autenticação
│   ├── controllers/         # Entrada HTTP e renderização
│   ├── db/                  # Migration e seed
│   ├── middlewares/         # Autenticação e tratamento de erros
│   ├── models/              # Tipos do domínio
│   ├── repositories/        # Persistência PostgreSQL
│   ├── routes/              # APIs, views e formulários
│   ├── schemas/             # Validação Zod
│   ├── services/            # Regras de negócio
│   ├── test/ e tests/       # Testes automatizados
│   └── views/               # Templates EJS
├── .env.example
├── package.json
└── README.md
```

## Pré-requisitos

- Node.js 20 ou versão compatível;
- npm;
- PostgreSQL acessível localmente ou por Supabase;
- banco de testes separado para executar a suíte sem afetar dados de desenvolvimento.

## Configuração do ambiente

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo local de ambiente:

```bash
cp .env.example .env
```

3. Preencha as variáveis sem versionar credenciais:

```dotenv
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
DATABASE_URL_TEST=postgresql://usuario:senha@host:porta/banco_de_testes
JWT_SECRET=valor-aleatorio-longo
PORT=3000
```

`JWT_SECRET` é obrigatório para assinar e validar os tokens. Um valor local pode ser gerado com `openssl rand -hex 32`. Nunca reutilize exemplos, tokens pessoais ou segredos de produção no repositório.

4. Prepare a estrutura e os dados de demonstração:

```bash
npm run migrate
npm run seed
```

As migrations são idempotentes para o fluxo normal do projeto. O seed atualiza os perfis e recria a senha dos usuários de demonstração.

## Execução

```bash
npm run dev
```

Por padrão, a aplicação fica disponível em `http://localhost:3000`. A porta pode ser alterada por `PORT`.

### Usuários de demonstração

| E-mail | Perfil |
|---|---|
| `juliano.soares@atvos.com` | analista |
| `bianca.souza@atvos.com` | coordenador |
| `marcelo.andrade@atvos.com` | administrador |

A senha criada pelo seed para os três usuários é `demo123`. Essas contas são destinadas apenas ao ambiente acadêmico de demonstração.

### Primeiro acesso

Usuários administrativos podem ser cadastrados inicialmente sem senha. Nesse caso, o usuário acessa `GET /primeiro-acesso`, informa o e-mail cadastrado e define uma senha com pelo menos oito caracteres. O fluxo também possui endpoints JSON para emissão de token temporário e definição de senha; o token expira após 24 horas e só pode ser usado por usuário ativo que ainda não tenha senha.

## Rotas principais

### Views e formulários HTML

| Método | Rota | Finalidade |
|---|---|---|
| GET, POST | `/login` | Exibir e processar login. |
| POST | `/logout` | Revogar a sessão atual e limpar cookies. |
| GET, POST | `/primeiro-acesso` | Definir a primeira senha pela interface. |
| GET | `/` | Página inicial autenticada. |
| GET, POST | `/parceiros` | Listar e cadastrar parceiros. |
| GET | `/parceiros/novo` | Formulário de parceiro. |
| GET | `/parceiros/:id` | Detalhe e histórico do parceiro. |
| GET, POST | `/parceiros/:id/editar` | Editar parceiro. |
| GET | `/validacao` | Fila de parceiros pendentes. |
| GET, POST | `/validacao/:id/...` | Revisar, aprovar ou devolver parceiro. |
| GET, POST | `/terras` | Listar e cadastrar terras. |
| GET, POST | `/terras/:id/editar` | Editar terra. |
| GET, POST | `/terras/:id/vincular-parceiro` | Vincular parceiro a uma terra. |
| GET, POST | `/usuarios...` | Gestão de usuários, perfis e inativação. |
| GET | `/parceiros/exportar` | Exportar parceiros em CSV. |

### API JSON

- `/api/parceiros` e `/api/parceiros/:id`;
- `/api/parceiros/:id/validacao`, `/aprovar`, `/devolver`, `/historico` e `/terras`;
- `/api/terras` e `/api/terras/:id/parceiros`;
- `/api/usuarios`;
- `/primeiro-acesso/solicitar` e `/primeiro-acesso/definir-senha`;
- `/auth/sessoes/:id`;
- `/dashboards/interacoes`.

Os métodos e contratos detalhados estão no WAD e nos documentos de endpoint em `documentos/`.

## Testes e validações

```bash
npx tsc --noEmit
npm test
```

A suíte usa `DATABASE_URL_TEST` quando definida e executa diversos testes com PostgreSQL real. Dependendo da latência do Supabase, a execução completa pode levar mais de dez minutos. Não aponte `DATABASE_URL_TEST` para um banco com dados que precisem ser preservados.

## Troubleshooting

### `DATABASE_URL is not defined`

Confirme que o `.env` existe na raiz e contém `DATABASE_URL`. Para testes, configure também `DATABASE_URL_TEST`.

### Falha de conexão com Supabase

Confira host, usuário, senha com URL encoding, porta e modo de conexão. Para o pooler do Supabase, use a URI fornecida no painel do projeto e verifique se a porta corresponde ao modo escolhido.

### `JWT_SECRET nao configurado`

Defina `JWT_SECRET` no `.env` e reinicie o servidor. Cookies emitidos com outro segredo deixam de ser válidos.

### Login redireciona novamente para `/login`

Rode migrations e seed, confirme que o usuário está ativo e limpe cookies antigos do navegador. Sessões revogadas ou de usuários inativos são rejeitadas pelo middleware.

### Testes demoram ou não encerram imediatamente

Grande parte da suíte integra com banco real e roda sequencialmente. Aguarde o resumo final. O Jest usa `--forceExit` porque o pool pode manter handles abertos após as asserções.

## Documentação

- [WAD](documentos/wad.md)
- [Documentação estática da API](public/docs/index.html)
- [Documentos de endpoints](documentos/)

## Contexto acadêmico e licença

Projeto desenvolvido no Inteli em parceria com a ATVOS. O conteúdo está licenciado sob [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
