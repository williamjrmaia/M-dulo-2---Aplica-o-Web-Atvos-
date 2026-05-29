import pool from '../config/connection';

async function seed(): Promise<void> {
  console.log('[SEED] Iniciando seed...');

  await pool.query(`
    INSERT INTO perfil_acesso (nome, requer_aprovacao, descricao) VALUES
      ('analista',      TRUE,  'Analista de negócios agrícolas'),
      ('coordenador',   FALSE, 'Coordenador de parceiros'),
      ('administrador', FALSE, 'Administrador do sistema')
    ON CONFLICT (nome) DO NOTHING;
  `);

  console.log('[SEED] Seed concluído com sucesso!');
  await pool.end();
}

seed().catch(err => {
  console.error('[SEED] Erro:', (err as Error).message);
  process.exit(1);
});
