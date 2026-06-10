import { UserRepository } from '../repositories/userRepository';
import { UserService } from '../services/userService';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, ids } from './helpers/usuarios';

const service = new UserService(new UserRepository());
const EMAIL = 'itg.svc.inativa@atvos.test';

let perfis: Record<string, string>;
let usuarioId: string;

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.administrador, ativo: true });
  usuarioId = u.id;
});

afterEach(async () => {
  await pool.query(
    `DELETE FROM registro_alteracao
      WHERE entidade_id = $1
         OR usuario_id = $1
         OR aprovado_por = $1`,
    [usuarioId]
  );
  await removerUsuarioPorEmail(EMAIL);
});

afterAll(async () => {
  await pool.end();
});

describe('UserService.inativarUsuario (integração com banco real)', () => {
  it('inativa o usuario quando ele existir e persiste ativo=false', async () => {
    const resultado = await service.inativarUsuario(usuarioId);

    expect(resultado.ativo).toBe(false);
    const { rows } = await pool.query('SELECT ativo FROM usuarios WHERE id = $1', [usuarioId]);
    expect(rows[0].ativo).toBe(false);
  });

  it('rejeita quando o id nao for informado', async () => {
    await expect(service.inativarUsuario('')).rejects.toThrow('Dados obrigatorios ausentes');
  });

  it('rejeita quando o usuario nao existir', async () => {
    await expect(service.inativarUsuario(ids.inexistente)).rejects.toThrow('Usuario nao encontrado');
  });
});
