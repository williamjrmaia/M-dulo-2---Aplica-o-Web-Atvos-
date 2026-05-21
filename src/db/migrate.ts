import path from 'path';
import fs from 'fs';
import pool from '../config/connection';

const runMigrations = async (): Promise<void> => {
  console.log('[MIGRATE] Iniciando migrations...');

  const sqlPath = path.resolve(__dirname, 'migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('[MIGRATE] Migrations concluídas com sucesso!');
  } catch (error) {
    console.error('[MIGRATE] Erro ao rodar migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();