# Inteli - Instituto de Tecnologia e Liderança 

<p align="center">
<a href= "https://www.inteli.edu.br/"><img src="/assets/inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" border="0"></a>
</p>

# Nome do projeto

## Safra Control

## :🧑‍🎓 Integrantes: 
- <a href="https://www.linkedin.com/in/haila-falcao/">Haila Thauane Falcão Novaes</a>
- <a href="https://www.linkedin.com/in/tiago-brun-de-arruda-17959a3a9/">Tiago Brun de Arruda</a>
- <a href="https://www.linkedin.com/in/gabriel-gomes-pimentel/" >Gabriel Gomes Pimentel</a> 
- <a href="https://www.linkedin.com/in/ant%C3%B4nio-neto-83971b23b/">Antonio de Souza Dantas Neto</a> 
- <a href="https://www.linkedin.com/in/jo%C3%A3o-paulo-barreto-ferreira-andrade-rodrigues-de-paula-b483203aa/">João Paulo Barreto Ferreira Andrade Rodrigues de Paula</a>
- <a href="https://www.linkedin.com/in/william-maia-95785b323/">William Junior dos Santos Maia</a> 
- <a href="https://www.linkedin.com/in/marianamoussa/">Mariana Pires de Carvalho Moussa</a>

## 🧑‍🏫 Professores:
### Orientador(a) 
- <a href="https://www.linkedin.com/in/fabiocassiosouza/">Fábio Cássio de Souza</a>
### Instrutores
- <a href="https://www.linkedin.com/in/bruna-mayer/">Bruna Mayer Costa</a>
- <a href="https://www.linkedin.com/in/afonsolelis/">Afonso Cesar Lelis Brandão</a> 
- <a href="https://www.linkedin.com/in/marcelo-gon%C3%A7alves-phd/">Marcelo Luiz do Amaral Gonçalves</a> 
- <a href="https://www.linkedin.com/in/cristinagramani/">Maria Cristina Nogueira Gramani</a>
- <a href="https://www.linkedin.com/in/marcelodesterro/">Marcelo de Paula do Desterro</a>

## 📝 Descrição

O projeto é a solução web CRM desenvolvida para a ATVOS, empresa do setor sucroenergético, com o objetivo de centralizar e estruturar a gestão do relacionamento com parceiros de terras e fornecedores de cana-de-açúcar. As informações antes dispersas em planilhas, e-mails e anotações individuais passam a ser gerenciadas em um único ambiente digital, garantindo rastreabilidade, padronização dos cadastros e preservação do histórico de interações ao longo das safras independente de mudanças no time. A aplicação conta com três níveis de acesso (administrador, editor e observador), registro de histórico de alterações, filtros por nome, região e tipo de parceiro e indicadores chaves de desempenho, substituindo o modelo fragmentado por um fluxo estruturado de informações que apoia a tomada de decisão estratégica da área de Negócios Agrícolas.

## 📝 Link de demonstração

_Coloque aqui o link para o vídeo de demonstração do projeto_

## 📁 Estrutura de pastas

```
G06/
├── assets/
├── documentos/
├── node_modules/
├── public/
├── src/
├── .env
├── .env.example
├── .gitattributes
├── .gitignore
├── jest.config.js
├── package-lock.json
├── package.json
├── README.md
├── requests.http
└── tsconfig.json

```

## 💻 Configuração para desenvolvimento e execução do código

Pré-requisitos:

- Node.js instalado.
- Banco PostgreSQL/Supabase acessível.
- Variável `DATABASE_URL` configurada conforme o arquivo `.env.example`.

Passo a passo para executar o backend:

1. Instale as dependências:

```sh
npm install
```

2. Crie o arquivo de ambiente e configure a conexão com o banco:

```sh
cp .env.example .env
```

3. Rode migrations e seed:

```sh
npm run migrate
npm run seed
```

4. Inicie o backend:

```sh
npm run dev
```

Por padrão, a API roda em `http://localhost:3000`. A porta pode ser alterada pela variável `PORT`.

Para executar os testes automatizados:

```sh
npm test
```

## 🗃 Histórico de lançamentos

* 0.5.0 - XX/XX/2024
    * 
* 0.4.0 - XX/XX/2024
    * 
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
```
Alunos inteli (remover essa observação do readme.md após leitura e execução, junto com o link para o tutorial):

1. Siga o tutorial para criação da licença: https://drive.google.com/file/d/1hXWLHUhjBkPVuGqeE2LZKozFntnJZzlx/view
```

<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/Intelihub/Template_M2/">MODELO GIT INTELI</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.yggbrasil.com.br/vr">Inteli, Antonio, Gabriel, Haila, João, Mariana, Tiago, William</a> is licensed under <a href="http://creativecommons.org/licenses/by/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">Attribution 4.0 International</a>.</p>

