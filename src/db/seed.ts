import bcrypt from 'bcryptjs';
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

  const senhaHash = bcrypt.hashSync('demo123', 10);

  const usuariosDemo: Array<{ nome: string; email: string; perfil: string }> = [
    { nome: 'Juliano Soares',  email: 'juliano.soares@atvos.com',  perfil: 'analista' },
    { nome: 'Bianca Souza',    email: 'bianca.souza@atvos.com',    perfil: 'coordenador' },
    { nome: 'Marcelo Andrade', email: 'marcelo.andrade@atvos.com', perfil: 'administrador' },
  ];

  for (const u of usuariosDemo) {
    await pool.query(
      `INSERT INTO usuarios (perfil_acesso_id, nome, email, senha_hash, ativo)
       SELECT pa.id, $1, $2, $3, TRUE
         FROM perfil_acesso pa
        WHERE pa.nome = $4
       ON CONFLICT (email) DO UPDATE
          SET senha_hash = EXCLUDED.senha_hash,
              ativo = TRUE;`,
      [u.nome, u.email, senhaHash, u.perfil],
    );
  }

  console.log('[SEED] Seed concluído com sucesso!');
  await pool.end();
}

seed().catch(err => {
  console.error('[SEED] Erro:', (err as Error).message);
  process.exit(1);
});
