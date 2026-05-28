import path from 'path';
import dotenv from 'dotenv';
import app from './app';

[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Servidor ATVOS CRM rodando na porta ${port}`);
  });
}

export default app;
