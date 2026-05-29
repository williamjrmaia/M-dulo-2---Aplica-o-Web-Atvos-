import fs from 'fs';
import path from 'path';
import pool, { getConnectionErrorHint } from '../config/connection';

const getMigrationFiles = (): string[] => {
  const baseMigration = path.join(__dirname, 'migration.sql');
  const migrationsDir = path.join(__dirname, 'migrations');
  const orderedMigrations = fs.existsSync(migrationsDir)
    ? fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort()
        .map((file) => path.join(migrationsDir, file))
    : [];

  return [baseMigration, ...orderedMigrations].filter((filePath) =>
    fs.existsSync(filePath),
  );
};

const runMigrations = async (): Promise<void> => {
  console.log('[MIGRATE] Iniciando migrations...');

  try {
    const migrationFiles = getMigrationFiles();

    for (const filePath of migrationFiles) {
      console.log(`[MIGRATE] Aplicando ${path.basename(filePath)}...`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await pool.query(sql);
    }

    console.log('[MIGRATE] Migrations concluidas com sucesso!');
  } catch (error) {
    console.error('[MIGRATE] Erro ao rodar migrations:', getConnectionErrorHint(error as Error));
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();
