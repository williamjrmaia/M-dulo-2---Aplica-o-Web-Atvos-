import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, ids } from './helpers/usuarios';

const service = new UserService(new UserRepository());
const EMAIL = 'itg.svc.perfil@atvos.test';
const EMAIL_NOVO = 'itg.svc.cadastro@atvos.test';

let perfis: Record<string, string>;
let usuarioId: string;

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista });
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
  await removerUsuarioPorEmail(EMAIL_NOVO);
});

afterAll(async () => {
  await pool.end();
});

describe('UserService.listarPerfis / listarUsuarios / buscarUsuario', () => {
  it('lista os perfis de acesso cadastrados', async () => {
    const lista = await service.listarPerfis();
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.length).toBeGreaterThan(0);
  });

  it('lista os usuarios cadastrados incluindo o usuario criado', async () => {
    const lista = await service.listarUsuarios();
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.some((u) => u.id === usuarioId)).toBe(true);
  });

  it('retorna usuario existente por id', async () => {
    const resultado = await service.buscarUsuario(usuarioId);
    expect(resultado).not.toBeNull();
    expect(resultado?.id).toBe(usuarioId);
  });

  it('retorna null para usuario inexistente', async () => {
    const resultado = await service.buscarUsuario(ids.inexistente);
    expect(resultado).toBeNull();
  });
});

describe('UserService.cadastraUsuario — validacoes de entrada', () => {
  it('rejeita cadastro com email invalido', async () => {
    await expect(
      service.cadastraUsuario({
        nome: 'Teste',
        email: 'email-invalido',
        perfil_acesso_id: perfis.analista,
      })
    ).rejects.toThrow('Dados de entrada invalidos');
  });

  it('rejeita cadastro sem payload', async () => {
    await expect(
      service.cadastraUsuario(null as unknown as Parameters<typeof service.cadastraUsuario>[0])
    ).rejects.toThrow('Dados de entrada invalidos');
  });
});

describe('UserService.cadastraUsuario (integração com banco real)', () => {
  it('cadastra usuario novo com nome aparado e email em minusculas', async () => {
    const criado = await service.cadastraUsuario({
      nome: '  Usuario Novo  ',
      email: EMAIL_NOVO.toUpperCase(),
      perfil_acesso_id: perfis.analista,
    });

    expect(criado.id).toBeDefined();
    expect(criado.nome).toBe('Usuario Novo');
    expect(criado.email).toBe(EMAIL_NOVO);

    const { rows } = await pool.query('SELECT nome, email FROM usuarios WHERE id = $1', [criado.id]);
    expect(rows[0]).toMatchObject({ nome: 'Usuario Novo', email: EMAIL_NOVO });
  });

  it('bloqueia o cadastro quando o perfil nao existe', async () => {
    await expect(
      service.cadastraUsuario({
        nome: 'Usuario Sem Perfil',
        email: EMAIL_NOVO,
        perfil_acesso_id: ids.inexistente,
      })
    ).rejects.toThrow('Perfil nao encontrado');
  });

  it('bloqueia o cadastro quando o email ja esta cadastrado', async () => {
    await expect(
      service.cadastraUsuario({
        nome: 'Usuario Repetido',
        email: EMAIL,
        perfil_acesso_id: perfis.analista,
      })
    ).rejects.toThrow('Email ja cadastrado');
  });
});

describe('UserService — branches de corrida (unitário, com stub)', () => {
  const usuarioFake = {
    id: 'u-1',
    nome: 'Usuario Stub',
    email: 'stub@atvos.test',
    ativo: true,
    perfil_acesso_id: 'p-1',
  };

  it('informa quando o usuario some entre a busca e a atualizacao', async () => {
    const stub = {
      buscarPorId: async () => usuarioFake,
      atualizaUsuario: async () => null,
    } as unknown as UserRepository;

    await expect(
      new UserService(stub).atualizaUsuario('u-1', { nome: 'Novo Nome' })
    ).rejects.toThrow('Usuario nao localizado na base');
  });

  it('informa quando o usuario some entre a busca e a inativacao', async () => {
    const stub = {
      buscarPorId: async () => usuarioFake,
      inativarUsuario: async () => null,
    } as unknown as UserRepository;

    await expect(new UserService(stub).inativarUsuario('u-1')).rejects.toThrow(
      'Usuario nao encontrado'
    );
  });
});

describe('UserService.atualizaUsuario — branches de validacao', () => {
  it('rejeita quando nenhum campo for informado', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, {})
    ).rejects.toThrow('Dados de entrada invalidos');
  });

  it('rejeita quando nome for string vazia', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, { nome: '' })
    ).rejects.toThrow('Dados de entrada invalidos');
  });

  it('rejeita quando ativo nao for boolean', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, { ativo: 'sim' as unknown as boolean })
    ).rejects.toThrow('Dados de entrada invalidos');
  });

  it('rejeita quando o payload for nulo', async () => {
    await expect(
      service.atualizaUsuario(usuarioId, null as unknown as Parameters<typeof service.atualizaUsuario>[1])
    ).rejects.toThrow('Dados de entrada invalidos');
  });

  it('atualiza o usuario quando o perfil enviado existe', async () => {
    const resultado = await service.atualizaUsuario(usuarioId, {
      perfil_acesso_id: perfis.coordenador,
    });
    expect(resultado.perfil_acesso_id).toBe(perfis.coordenador);
  });
});

describe('UserService.atualizaPerfilDeAcesso (integração com banco real)', () => {
  it('atualiza o perfil quando o perfil existe e persiste no banco', async () => {
    const resultado = await service.atualizaPerfilDeAcesso(usuarioId, perfis.coordenador);

    expect(resultado.perfil_acesso_id).toBe(perfis.coordenador);
    const { rows } = await pool.query('SELECT perfil_acesso_id FROM usuarios WHERE id = $1', [usuarioId]);
    expect(rows[0].perfil_acesso_id).toBe(perfis.coordenador);
  });

  it('bloqueia a atualizacao quando o perfil nao existe', async () => {
    await expect(
      service.atualizaPerfilDeAcesso(usuarioId, ids.inexistente)
    ).rejects.toThrow('Perfil nao encontrado');
  });

  it('valida campos obrigatorios antes de consultar o banco', async () => {
    await expect(service.atualizaPerfilDeAcesso(usuarioId, '')).rejects.toThrow('Dados obrigatorios ausentes');
  });

  it('informa quando o usuario nao existe', async () => {
    await expect(
      service.atualizaPerfilDeAcesso(ids.inexistente, perfis.coordenador)
    ).rejects.toThrow('Usuario nao encontrado');
  });
});
