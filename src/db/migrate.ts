import pool from '../config/connection';
import fs from 'fs';
import path from 'path';

async function migrate(): Promise<void> {
  console.log('[MIGRATE] Iniciando migrations...');
  const migrationsDir = path.join(__dirname, 'migrations');

  try {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`[MIGRATE] Aplicando ${file}...`);
      await pool.query(sql);
    }

    console.log('[MIGRATE] Migrations concluidas com sucesso!');
  } catch (error) {
    console.error('[MIGRATE] Erro:', (error as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
