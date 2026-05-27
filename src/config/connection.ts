import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath });
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL nao definida no ambiente.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

export default pool;
