import 'dotenv/config';
import { Client } from 'pg';

async function seed(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    INSERT INTO perfil_acesso (nome, requer_aprovacao, descricao) VALUES
      ('analista',      TRUE,  'Analista de negócios agrícolas'),
      ('coordenador',   FALSE, 'Coordenador de parceiros'),
      ('administrador', FALSE, 'Administrador do sistema')
    ON CONFLICT (nome) DO NOTHING;
  `);

  await client.end();
  console.log('Seed concluído com sucesso.');
}

seed().catch(err => {
  console.error('Erro no seed:', (err as Error).message);
  process.exit(1);
});
