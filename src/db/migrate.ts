import 'dotenv/config';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function migrate(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8');
  await client.query(sql);

  await client.end();
  console.log('Migration concluída com sucesso.');
}

migrate().catch(err => {
  console.error('Erro na migration:', (err as Error).message);
  process.exit(1);
});
