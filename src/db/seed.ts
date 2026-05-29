import pool from '../config/connection';

async function seed(): Promise<void> {
  console.log('[SEED] Iniciando seed...');
<<<<<<< HEAD

=======
>>>>>>> f00b3dd287846181bf74aa216f6f7bf1d417bdd8
  await pool.query(`
    INSERT INTO perfil_acesso (nome, requer_aprovacao, descricao) VALUES
      ('analista',      TRUE,  'Analista de negócios agrícolas'),
      ('coordenador',   FALSE, 'Coordenador de parceiros'),
      ('administrador', FALSE, 'Administrador do sistema')
    ON CONFLICT (nome) DO NOTHING;
  `);
<<<<<<< HEAD

=======
>>>>>>> f00b3dd287846181bf74aa216f6f7bf1d417bdd8
  console.log('[SEED] Seed concluído com sucesso!');
  await pool.end();
}

seed().catch(err => {
  console.error('[SEED] Erro:', (err as Error).message);
  process.exit(1);
});