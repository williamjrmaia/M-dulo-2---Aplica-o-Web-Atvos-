<<<<<<< HEAD
=======
import pool from '../config/connection';
import fs from 'fs';
>>>>>>> f00b3dd287846181bf74aa216f6f7bf1d417bdd8
import path from 'path';
import fs from 'fs';
import pool from '../config/connection';

<<<<<<< HEAD
const runMigrations = async (): Promise<void> => {
  console.log('[MIGRATE] Iniciando migrations...');

  const sqlPath = path.resolve(__dirname, 'migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('[MIGRATE] Migrations concluídas com sucesso!');
  } catch (error) {
    console.error('[MIGRATE] Erro ao rodar migrations:', error);
=======
async function migrate(): Promise<void> {
  console.log('[MIGRATE] Iniciando migrations...');
 const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('[MIGRATE] Migrations concluídas com sucesso!');

  } catch (error) {
    console.error('[MIGRATE] Erro:', (error as Error).message);
>>>>>>> f00b3dd287846181bf74aa216f6f7bf1d417bdd8
    process.exit(1);
  } finally {
    await pool.end();
  }
<<<<<<< HEAD
};

runMigrations();
=======
}

migrate();
>>>>>>> f00b3dd287846181bf74aa216f6f7bf1d417bdd8
