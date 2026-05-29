import path from 'path';
import fs from 'fs';
import pool from '../config/connection';

const runMigrations = async (): Promise<void> => {
  console.log('[MIGRATE] Iniciando migrations...');

  const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf-8');

  try {
    await pool.query(sql);
    console.log('[MIGRATE] Migrations concluídas com sucesso!');
  } catch (error) {
    console.error('[MIGRATE] Erro ao rodar migrations:', (error as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();
