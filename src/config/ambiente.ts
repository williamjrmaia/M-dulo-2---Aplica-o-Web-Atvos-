// Validação das variáveis de ambiente obrigatórias.
//
// Existe para dar um "fail-fast" claro no boot: em vez de a aplicação subir e
// só quebrar mais tarde (ex.: 500 "Configuração de autenticação ausente" na
// primeira tentativa de login quando falta JWT_SECRET), o servidor aborta logo
// na inicialização com uma mensagem acionável.

function temValor(valor: string | undefined): boolean {
  return typeof valor === 'string' && valor.trim() !== '';
}

// Retorna os nomes das variáveis obrigatórias ausentes/vazias.
// O banco aceita tanto DATABASE_URL quanto a configuração via DB_HOST
// (mesmo critério de src/config/connection.ts), então só acusamos
// DATABASE_URL ausente quando nenhuma das duas formas está presente.
export function variaveisObrigatoriasAusentes(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const ausentes: string[] = [];

  if (!temValor(env.JWT_SECRET)) {
    ausentes.push('JWT_SECRET');
  }

  if (!temValor(env.DATABASE_URL) && !temValor(env.DB_HOST)) {
    ausentes.push('DATABASE_URL');
  }

  return ausentes;
}

const DICAS_POR_VARIAVEL: Record<string, string> = {
  JWT_SECRET: 'JWT_SECRET=<gere um valor aleatório, ex.: openssl rand -hex 32>',
  DATABASE_URL:
    'DATABASE_URL=postgresql://usuario:senha@host:5432/banco (ou configure DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD)',
};

// Monta a mensagem de erro acionável a partir das variáveis ausentes.
export function mensagemAmbienteInvalido(ausentes: string[]): string {
  const linhas = [
    'Configuração de ambiente incompleta. Variáveis obrigatórias ausentes no .env:',
    ...ausentes.map((nome) => `  - ${nome}`),
    '',
    'Configure-as no arquivo .env na raiz do projeto. Exemplos:',
    ...ausentes.map((nome) => `  ${DICAS_POR_VARIAVEL[nome] ?? `${nome}=...`}`),
  ];

  return linhas.join('\n');
}

// Lança um erro com mensagem acionável quando alguma variável obrigatória
// estiver ausente. Não escreve no console nem encerra o processo — quem chama
// (o boot do servidor) decide como reagir.
export function garantirAmbienteValido(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const ausentes = variaveisObrigatoriasAusentes(env);

  if (ausentes.length > 0) {
    throw new Error(mensagemAmbienteInvalido(ausentes));
  }
}
