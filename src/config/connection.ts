import path from 'path';
import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';

[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'src', '.env'),
  path.resolve(process.cwd(), '..', '.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath });
});

const databaseUrl =
  process.env.NODE_ENV === 'test'
    ? process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

if (!databaseUrl && !process.env.DB_HOST) {
  throw new Error(
    'DATABASE_URL is not defined. Configure DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD.',
  );
}

export const getConnectionErrorHint = (error: Error): string => {
  if (!databaseUrl) {
    return error.message;
  }

  if (error.message.includes('tenant/user') || error.message.includes('ENOTFOUND')) {
    return `${error.message}. Verifique se a DATABASE_URL do Supabase usa o usuario e host corretos do pooler, por exemplo postgresql://postgres.<project-ref>:<senha-url-encoded>@<region>.pooler.supabase.com:6543/postgres. Se a senha tiver caracteres especiais, gere novamente a URI no painel ou aplique URL encoding.`;
  }

  return error.message;
};

const useSsl = Boolean(
  databaseUrl &&
    !databaseUrl.includes('localhost') &&
    !databaseUrl.includes('127.0.0.1'),
);
const connectionTimeoutMillis =
  Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000;

const poolConfig: PoolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis,
    }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis,
    };

const pool = new Pool(poolConfig);

pool.on('error', (error) => {
  console.error('[DB] Erro inesperado na conexao:', getConnectionErrorHint(error));
});

export default pool;
