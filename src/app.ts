import path from 'path';
import dotenv from 'dotenv';
import app from './server';

[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Servidor ATVOS CRM rodando na porta ${port}`);
});