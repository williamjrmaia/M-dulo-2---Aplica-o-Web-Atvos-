import { UserRepository } from '../repositories/userRepository';
import { UserService } from '../services/userService';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, ids } from './helpers/usuarios';

const service = new UserService(new UserRepository());
const EMAIL = 'itg.svc.update@atvos.test';

let perfis: Record<string, string>;
let usuarioId: string;

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista, nome: 'Usuario Atual' });
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
  await removerUsuarioPorEmail('itg.svc.update.editado@atvos.test');
});

afterAll(async () => {
  await pool.end();
});

describe('UserService.atualizaUsuario (integração com banco real)', () => {
  it('atualiza o usuario quando dados forem validos e usuario existir', async () => {
    const resultado = await service.atualizaUsuario(usuarioId, {
      nome: 'Usuario Editado',
      email: 'itg.svc.update.editado@atvos.test',
    });

    expect(resultado.nome).toBe('Usuario Editado');
    expect(resultado.email).toBe('itg.svc.update.editado@atvos.test');

    const { rows } = await pool.query('SELECT nome, email FROM usuarios WHERE id = $1', [usuarioId]);
    expect(rows[0].nome).toBe('Usuario Editado');
    expect(rows[0].email).toBe('itg.svc.update.editado@atvos.test');

    const { rows: historico } = await pool.query(
      `SELECT entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario
         FROM registro_alteracao
        WHERE entidade_id = $1
          AND entidade_afetada = 'usuario'
          AND tipo_operacao = 'edicao'`,
      [usuarioId]
    );

    expect(historico).toHaveLength(1);
    expect(historico[0]).toMatchObject({
      entidade_afetada: 'usuario',
      entidade_id: usuarioId,
      tipo_operacao: 'edicao',
      status: 'aprovado',
      comentario: 'Dados de usuário atualizados',
    });
    expect(historico[0].dados_anteriores).toMatchObject({
      id: usuarioId,
      nome: 'Usuario Atual',
      email: EMAIL,
    });
    expect(historico[0].dados_novos).toMatchObject({
      id: usuarioId,
      nome: 'Usuario Editado',
      email: 'itg.svc.update.editado@atvos.test',
    });
    expect(historico[0].dados_anteriores.senha_hash).toBeUndefined();
    expect(historico[0].dados_novos.senha_hash).toBeUndefined();
  });

  it('rejeita payload mal formatado antes de tocar o banco', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, { email: 'email-invalido' })
    ).rejects.toThrow('Dados de entrada invalidos');
  });

  it('rejeita quando o usuario nao existir', async () => {
    await expect(
      service.atualizaUsuario(ids.inexistente, { nome: 'Novo Nome' })
    ).rejects.toThrow('Usuario nao localizado na base');
  });

  it('valida o perfil quando perfil_acesso_id for enviado', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, { perfil_acesso_id: ids.inexistente })
    ).rejects.toThrow('Perfil nao encontrado');
  });
});
