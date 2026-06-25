import path from 'path';
import dotenv from 'dotenv';
import app from './app';
import { garantirAmbienteValido } from './config/ambiente';

[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath });
});

if (require.main === module) {
  // Fail-fast: valida as variáveis obrigatórias antes de subir o servidor,
  // evitando que a aplicação suba e só quebre na primeira requisição (ex.:
  // 500 "Configuração de autenticação ausente" no login sem JWT_SECRET).
  try {
    garantirAmbienteValido();
  } catch (error) {
    console.error('\n[ERRO DE CONFIGURAÇÃO]');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Servidor Safra Control rodando na porta ${port}`);
  });
}

export default app;
