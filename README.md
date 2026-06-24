# Inteli - Instituto de Tecnologia e Liderança 

<p align="center">
<a href= "https://www.inteli.edu.br/"><img src="/assets/inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" border="0"></a>
</p>

# Safra Control

Safra Control é uma aplicação web de CRM agrícola desenvolvida pelo grupo Atwatts, no Módulo 2 do Inteli, para apoiar a ATVOS na gestão do relacionamento com parceiros de terras, fornecedores de cana-de-açúcar e proprietários cedentes. O projeto responde a um problema operacional recorrente no setor sucroenergético: informações estratégicas dispersas em planilhas, e-mails, anotações individuais e bases pouco padronizadas, que dificultam a consulta, reduzem a rastreabilidade e fazem com que parte importante do histórico de relacionamento dependa da memória de cada colaborador. Ao transformar esses registros em uma base digital centralizada, o sistema busca preservar conhecimento institucional, reduzir retrabalho e oferecer mais segurança para decisões comerciais, agrícolas e administrativas.

A solução foi concebida como uma aplicação full stack acessada pelo navegador, com frontend renderizado no servidor, backend em Node.js com TypeScript, Express, EJS, CSS e JavaScript próprios, banco PostgreSQL/Supabase e validação de dados com Zod. A arquitetura segue uma divisão em camadas, separando rotas, controllers, services, repositories, schemas, models, middlewares e tratamento de erros. Essa organização torna as regras de negócio mais fáceis de manter, permite testar partes críticas de forma isolada e evita que a interface seja a única responsável por controlar permissões ou validar operações sensíveis.

No uso cotidiano, o Safra Control permite cadastrar, consultar, editar e acompanhar parceiros agrícolas, mantendo dados cadastrais, vínculos com terras, status de validação, histórico de alterações e interações registradas pela equipe. O sistema contempla fluxos de rascunho, envio para validação, aprovação e devolução com comentário, garantindo que cadastros relevantes passem por governança antes de se tornarem ativos. Também oferece filtros por nome, tipo, status, região, usina e dados agrícolas, além de exportação CSV para apoiar análises e atividades fora da plataforma.

A gestão de terras é outro eixo central da solução. A modelagem considera relações muitos-para-muitos entre parceiros e propriedades, permitindo representar cenários reais como herdeiros, coproprietários, fornecedores vinculados a diferentes áreas e terras associadas a mais de uma unidade operacional. A separação entre identidade do parceiro, papel comercial e vínculo com terra evita duplicidade de cadastros e mantém coerência entre fornecedores, arrendadores e demais relações comerciais existentes no domínio da ATVOS.

O controle de acesso foi estruturado em três perfis principais: analista, coordenador e administrador. Analistas podem cadastrar e atualizar registros, coordenadores revisam e validam informações, e administradores gerenciam usuários, perfis e operações amplas do sistema. A autenticação utiliza login, primeiro acesso com definição de senha, JWT, cookies HttpOnly e sessões persistidas, permitindo revogar acessos e impedir que usuários inativos continuem utilizando a aplicação.

A experiência de uso também recebeu atenção específica. O design system define cores institucionais, tipografia, espaçamentos, botões, tabelas, cards, modais, alertas, estados vazios e componentes de histórico, buscando uma interface clara para cadastros longos e consultas frequentes. Os testes de usabilidade indicaram boa aceitação geral, ao mesmo tempo em que revelaram melhorias importantes para envio à validação, feedbacks de interação e exibição do histórico.

Além das funcionalidades operacionais, o projeto valoriza rastreabilidade, qualidade e evolução futura. Alterações relevantes são associadas a responsáveis e timestamps, interações ficam organizadas em histórico consultável, e exclusões são tratadas de forma lógica para preservar auditoria. A solução foi documentada com requisitos, regras de negócio, diagramas, modelo de banco, endpoints, matriz de rastreabilidade, testes automatizados e avaliações de usabilidade. A suíte com Jest e Supertest cobre controllers, services, repositories, autenticação, parceiros, usuários, terras, validação, interações, exportação e dashboard JSON. Assim, o Safra Control consolida uma base técnica e funcional para substituir controles fragmentados por um fluxo confiável, rastreável e alinhado à transformação digital da gestão agrícola. Esse conjunto reforça continuidade operacional e oferece base para futuras integrações corporativas com dados confiáveis e governança.

## 🧑‍🎓 Integrantes do grupo Atwatts

- <a href="https://www.linkedin.com/in/ant%C3%B4nio-neto-83971b23b/">Antonio de Souza Dantas Neto</a>
- <a href="https://www.linkedin.com/in/gabriel-gomes-pimentel/">Gabriel Gomes Pimentel</a>
- <a href="https://www.linkedin.com/in/haila-falcao/">Haila Thauane Falcão Novaes</a>
- <a href="https://www.linkedin.com/in/jo%C3%A3o-paulo-barreto-ferreira-andrade-rodrigues-de-paula-b483203aa/">João Paulo Barreto Ferreira Andrade Rodrigues de Paula</a>
- <a href="https://www.linkedin.com/in/marianamoussa/">Mariana Pires de Carvalho Moussa</a>
- <a href="https://www.linkedin.com/in/tiago-brun-de-arruda-17959a3a9/">Tiago Brun de Arruda</a>
- <a href="https://www.linkedin.com/in/william-maia-95785b323/">William Junior dos Santos Maia</a>

## 🧑‍🏫 Professores

### Orientador(a)
- <a href="https://www.linkedin.com/in/fabiocassiosouza/">Fábio Cássio de Souza</a>

### Instrutores
- <a href="https://www.linkedin.com/in/bruna-mayer/">Bruna Mayer Costa</a>
- <a href="https://www.linkedin.com/in/afonsolelis/">Afonso Cesar Lelis Brandão</a>
- <a href="https://www.linkedin.com/in/marcelo-gon%C3%A7alves-phd/">Marcelo Luiz do Amaral Gonçalves</a>
- <a href="https://www.linkedin.com/in/cristinagramani/">Maria Cristina Nogueira Gramani</a>
- <a href="https://www.linkedin.com/in/marcelodesterro/">Marcelo de Paula do Desterro</a>

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
├── assets/                  # Imagens institucionais usadas na documentação
├── documentos/              # WAD, documentação técnica, evidências e materiais do projeto
│   ├── assets/              # Imagens, diagramas, wireframes, personas e guia de estilos
│   └── outros/              # Documentos complementares, endpoints e materiais auxiliares
├── public/
│   ├── css/                 # Estilos da interface renderizada no servidor
│   ├── docs/                # Documentação estática da API
│   └── js/                  # Scripts de busca, máscaras, modais e feedbacks visuais
├── src/
│   ├── app.ts               # Configuração do Express, middlewares, rotas e views
│   ├── server.ts            # Inicialização do servidor HTTP
│   ├── config/              # Configurações de autenticação e conexão com PostgreSQL/Supabase
│   ├── controllers/         # Camada de entrada HTTP: APIs JSON, formulários e renderização
│   ├── db/                  # Scripts de migration, seed e SQL versionado
│   │   └── migrations/      # Migrations adicionais e dados iniciais versionados
│   ├── errors/              # Classes e mensagens de erro da aplicação
│   ├── helpers/             # Utilitários compartilhados, como tratamento assíncrono
│   ├── middlewares/         # Autenticação, autorização e tratamento centralizado de erros
│   ├── models/              # Tipos, interfaces e entidades do domínio
│   ├── repositories/        # Camada de persistência e consultas ao banco
│   ├── routes/              # Mapeamento de rotas HTML e endpoints JSON
│   ├── schemas/             # Schemas Zod para validação de entrada
│   ├── services/            # Regras de negócio e orquestração entre domínio e persistência
│   ├── test/                # Testes legados mantidos no projeto
│   ├── tests/               # Suíte principal de testes automatizados
│   │   └── helpers/         # Helpers usados pelos testes
│   └── views/               # Templates EJS da camada de apresentação
│       ├── errors/          # Páginas de erro
│       ├── home/            # Tela inicial autenticada
│       ├── layouts/         # Layouts base
│       ├── login/           # Login e primeiro acesso
│       ├── parceiros/       # Telas de parceiros e validação
│       ├── partials/        # Partials reutilizáveis, como cabeçalho e rodapé
│       ├── terras/          # Telas de terras e vínculo com parceiros
│       └── usuarios/        # Telas de gestão de usuários
├── .env.example
├── eslint.config.js
├── jest.config.js
├── package.json
├── requests.http
├── tsconfig.json
└── README.md
```

## Pré-requisitos

- Node.js 20 ou versão compatível com TypeScript 5 e Express 5;
- npm;
- PostgreSQL acessível localmente, por Supabase ou por outro provedor compatível;
- banco de testes separado para executar a suíte sem afetar dados de desenvolvimento;
- acesso de escrita ao banco para rodar migrations e seed.

## Configuração do ambiente

1. Instale as dependências na raiz do projeto:

```bash
npm install
```

2. Crie o arquivo local de ambiente na raiz:

```bash
cp .env.example .env
```

3. Preencha as variáveis sem versionar credenciais. A forma recomendada é usar `DATABASE_URL`:

```dotenv
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
DATABASE_URL_TEST=postgresql://usuario:senha@host:porta/banco_de_testes
JWT_SECRET=valor-aleatorio-longo
PORT=3000
```

Também é possível configurar a conexão por partes quando não houver URL única:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safra_control
DB_USER=postgres
DB_PASSWORD=senha
```

`JWT_SECRET` é obrigatório para assinar e validar os tokens. Um valor local pode ser gerado com:

```bash
openssl rand -hex 32
```

Nunca reutilize exemplos, tokens pessoais ou segredos de produção no repositório. Em testes, `DATABASE_URL_TEST` tem prioridade quando `NODE_ENV=test`; se ela não existir, a suíte usa `DATABASE_URL`.

4. Prepare a estrutura e os dados de demonstração:

```bash
npm run migrate
npm run seed
```

O comando `npm run migrate` aplica `src/db/migration.sql` e, em seguida, os arquivos `.sql` em `src/db/migrations/`, em ordem alfabética. O seed atualiza os perfis e recria a senha dos usuários de demonstração.

## Execução

```bash
npm run dev
```

Por padrão, a aplicação fica disponível em `http://localhost:3000`. A porta pode ser alterada por `PORT`. O servidor carrega variáveis de ambiente a partir de `.env` na raiz do projeto e também procura um `.env` no diretório pai.

Antes de acessar as telas internas, faça login com um usuário de demonstração ou crie um usuário administrador pelo seed. As rotas internas redirecionam para `/login` quando não há sessão válida.

### 🔑 Usuários de demonstração

| E-mail | Perfil |
|---|---|
| `juliano.soares@atvos.com` | Analista |
| `bianca.souza@atvos.com` | Coordenadora |
| `marcelo.andrade@atvos.com` | Administrador |

A senha para todos os usuários é `demo123` (criada pelo seed). Essas contas são destinadas apenas ao ambiente acadêmico de demonstração.

### Primeiro acesso

Usuários podem ser cadastrados inicialmente sem senha. Nesse caso, o usuário acessa `GET /primeiro-acesso`, informa o e-mail cadastrado e define uma senha com pelo menos oito caracteres. O fluxo também possui endpoints JSON para emissão de token temporário e definição de senha; o token expira após 24 horas e só pode ser usado por usuário ativo que ainda não tenha senha.

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
| GET | `/terras/nova` | Formulário de terra. |
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

Os métodos e contratos detalhados estão no WAD e nos documentos de endpoint em `documentos/outros/`.

## Testes e validações

```bash
npx tsc --noEmit
npm run lint
npm test
```

Comandos auxiliares disponíveis:

```bash
npm run test:cov
npm run test:services
npm run lint:complexity
npm run cpd
npm run circular
```

A suíte usa `DATABASE_URL_TEST` quando definida e executa diversos testes com PostgreSQL real. Dependendo da latência do Supabase, a execução completa pode levar mais de dez minutos. Não aponte `DATABASE_URL_TEST` para um banco com dados que precisem ser preservados.

## Troubleshooting

### `DATABASE_URL is not defined`

Confirme que o `.env` existe na raiz e contém `DATABASE_URL`. Como alternativa, configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`. Para testes, configure também `DATABASE_URL_TEST`.

### Falha de conexão com Supabase

Confira host, usuário, senha com URL encoding, porta e modo de conexão. Para o pooler do Supabase, use a URI fornecida no painel do projeto e verifique se a porta corresponde ao modo escolhido.

### `JWT_SECRET` não configurado

Defina `JWT_SECRET` no `.env` e reinicie o servidor. Cookies emitidos com outro segredo deixam de ser válidos.

### Login redireciona novamente para `/login`

Rode migrations e seed, confirme que o usuário está ativo e limpe cookies antigos do navegador. Sessões revogadas ou de usuários inativos são rejeitadas pelo middleware.

### Testes demoram ou não encerram imediatamente

Grande parte da suíte integra com banco real e roda sequencialmente. Aguarde o resumo final. O Jest usa `--forceExit` porque o pool pode manter handles abertos após as asserções.

## Documentação

- [WAD](documentos/wad.md)
- [Documentação estática da API](public/docs/index.html)
- [Documentos de endpoints](documentos/outros/)

## 🗃 Histórico de lançamentos

* 0.5.0 - XX/XX/2024
    * 
* 0.4.0 - 12/06/2026
    * Segunda versão web com frontend renderizado no servidor (EJS) integrado ao backend
    * Autenticação com login, logout, primeiro acesso/definição de senha e proteção de rotas por perfil
    * Gestão de usuários com perfis, alteração de perfil, inativação lógica e revogação de sessões
    * Cadastro, edição, listagem, detalhe e inativação lógica de parceiros, com filtros e fluxo de rascunho, validação, aprovação e devolução
    * Cadastro, edição, listagem e inativação lógica de terras e vínculos parceiro-terra
    * Histórico de alterações, registro de interações e exportação CSV de parceiros
    * Validação de entrada com Zod e métricas agregadas de interações (dashboard JSON)
* 0.3.0 - 29/05/2024
    * Backend funcional com WebAPI e endpoints operantes
    * Protótipo de alta fidelidade e guia de estilos elaborados
    * Arquitetura em camadas documentada com diagramas atualizados
* 0.2.0 - 15/05/2024
    * Wireframe com fluxo de navegação criado
    * Diagramas UML e modelagem do banco de dados elaborados
* 0.1.0 - 01/05/2024
    * Análise de negócios e estrutura do WAD criados
    * Personas, User Stories e backlog elaborados
    * Requisitos funcionais, regras de negócio e casos de uso documentados

## 📋 Licença/License

Projeto desenvolvido no Inteli em parceria com a ATVOS. O conteúdo está licenciado sob [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/Intelihub/Template_M2/">MODELO GIT INTELI</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.inteli.edu.br/">Inteli</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/ant%C3%B4nio-neto-83971b23b/">Antonio</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/gabriel-gomes-pimentel/">Gabriel</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/haila-falcao/">Haila</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/jo%C3%A3o-paulo-barreto-ferreira-andrade-rodrigues-de-paula-b483203aa/">João</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/marianamoussa/">Mariana</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/tiago-brun-de-arruda-17959a3a9/">Tiago</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/william-maia-95785b323/">William</a> is licensed under <a href="http://creativecommons.org/licenses/by/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">Attribution 4.0 International</a>.</p>
