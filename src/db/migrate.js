require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8');
  await client.query(sql);

  await client.end();
  console.log('Migration concluída com sucesso.');
}

migrate().catch(err => {
  console.error('Erro na migration:', err.message);
  process.exit(1);
});
