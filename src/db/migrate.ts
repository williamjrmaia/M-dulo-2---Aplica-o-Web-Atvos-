import pool from '../config/connection';
import fs from 'fs';
import path from 'path';

async function migrate(): Promise<void> {
  console.log('[MIGRATE] Iniciando migrations...');
  const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('[MIGRATE] Migrations concluídas com sucesso!');
  } catch (error) {
    console.error('[MIGRATE] Erro:', (error as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();