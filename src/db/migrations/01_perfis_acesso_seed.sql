INSERT INTO perfil_acesso (nome, requer_aprovacao, descricao) VALUES
  ('analista', TRUE, 'Analista de negocios agricolas'),
  ('coordenador', FALSE, 'Coordenador de parceiros'),
  ('administrador', FALSE, 'Administrador do sistema')
ON CONFLICT (nome) DO UPDATE
  SET requer_aprovacao = EXCLUDED.requer_aprovacao,
      descricao = EXCLUDED.descricao;
