import path from 'path';
import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';

[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath });
});

const databaseUrl =
  process.env.NODE_ENV === 'test'
    ? process.env.DATABASE_URL_TEST
    : process.env.DATABASE_URL;

const useSsl = Boolean(
  databaseUrl &&
    !databaseUrl.includes('localhost') &&
    !databaseUrl.includes('127.0.0.1'),
);

const poolConfig: PoolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };

const pool = new Pool(poolConfig);

export default pool;