import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail } from './helpers/usuarios';

const EMAIL = 'itg.views.html@atvos.test';

let perfis: Record<string, string>;
let usuarioId: string;
let parceiroId: string;
let terraId: string;
const parceirosCriados = new Set<string>();
const terrasCriadas = new Set<string>();

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista });
  usuarioId = u.id;

  const parceiro = await request(app).post('/api/parceiros').send({
    nome: 'Parceiro Views HTML',
    tipo_pessoa: 'fisica',
    cpf_cnpj: randomUUID(),
    status: 'pendente',
    criado_por: usuarioId,
  });
  parceiroId = parceiro.body.id;
  parceirosCriados.add(parceiroId);

  const terra = await request(app).post('/api/terras').send({
    nome: 'Terra Views HTML',
    area_contratada_ha: 100,
    cidade: 'Ribeirão Preto',
    estado: 'SP',
    criado_por: usuarioId,
  });
  terraId = terra.body.id;
  terrasCriadas.add(terraId);
});

afterEach(async () => {
  const pIds = Array.from(parceirosCriados);
  const tIds = Array.from(terrasCriadas);
  await pool.query(
    'DELETE FROM registro_alteracao WHERE entidade_id = ANY($1::uuid[]) OR entidade_id = ANY($2::uuid[])',
    [pIds, tIds]
  );
  if (pIds.length > 0) {
    await pool.query('DELETE FROM telefone_parceiro WHERE parceiro_id = ANY($1::uuid[])', [pIds]);
    await pool.query('DELETE FROM parceiro_terra WHERE parceiro_id = ANY($1::uuid[])', [pIds]);
    await pool.query('DELETE FROM parceiros WHERE id = ANY($1::uuid[])', [pIds]);
  }
  if (tIds.length > 0) {
    await pool.query('DELETE FROM terras WHERE id = ANY($1::uuid[])', [tIds]);
  }
  await removerUsuarioPorEmail(EMAIL);
  parceirosCriados.clear();
  terrasCriadas.clear();
});

afterAll(async () => {
  await pool.end();
});

async function esperaViewHtml(rota: string) {
  const res = await request(app).get(rota);
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('text/html');
  expect(res.text.length).toBeGreaterThan(0);
  return res;
}

// CT54 → RN02 (RF011): telas públicas de autenticação respondem 200 com HTML
describe('views de autenticação (GET via Supertest)', () => {
  it('renderiza a tela de login', async () => {
    await esperaViewHtml('/login');
  });

  it('renderiza a tela de primeiro acesso', async () => {
    await esperaViewHtml('/primeiro-acesso');
  });
});

// CT55 → RN06 (RF002): telas de usuários respondem 200 com HTML
describe('views de usuários (GET via Supertest)', () => {
  it('renderiza a lista de usuários', async () => {
    await esperaViewHtml('/usuarios');
  });

  it('renderiza o formulário de novo usuário', async () => {
    await esperaViewHtml('/usuarios/novo');
  });

  it('renderiza a edição de um usuário existente', async () => {
    await esperaViewHtml(`/usuarios/${usuarioId}/editar`);
  });

  it('renderiza a tela de inativação de um usuário existente', async () => {
    await esperaViewHtml(`/usuarios/${usuarioId}/inativar`);
  });

  it('renderiza a tela de perfil de um usuário existente', async () => {
    await esperaViewHtml(`/usuarios/${usuarioId}/perfil`);
  });
});

// CT56 → RN04 (RF004, RF007): telas de parceiros respondem 200 com HTML
describe('views de parceiros (GET via Supertest)', () => {
  it('renderiza a lista de parceiros', async () => {
    await esperaViewHtml('/parceiros');
  });

  it('renderiza o formulário de novo parceiro', async () => {
    await esperaViewHtml('/parceiros/novo');
  });

  it('renderiza o detalhe de um parceiro existente', async () => {
    const res = await esperaViewHtml(`/parceiros/${parceiroId}`);
    expect(res.text).toContain('Parceiro Views HTML');
  });

  it('renderiza a edição de um parceiro existente', async () => {
    await esperaViewHtml(`/parceiros/${parceiroId}/editar`);
  });
});

// CT57 → RN11 (RF018, RF019) e RN13 (RF015) na vinculação: telas de terras respondem 200 com HTML
describe('views de terras (GET via Supertest)', () => {
  it('renderiza a lista de terras', async () => {
    await esperaViewHtml('/terras');
  });

  it('renderiza o formulário de nova terra', async () => {
    await esperaViewHtml('/terras/nova');
  });

  it('renderiza a edição de uma terra existente', async () => {
    await esperaViewHtml(`/terras/${terraId}/editar`);
  });

  it('renderiza a vinculação de parceiro de uma terra existente', async () => {
    await esperaViewHtml(`/terras/${terraId}/vincular-parceiro`);
  });
});

// CT58 → RN17 (RF022, RF023): telas da fila de validação respondem 200 com HTML
describe('views de validação (GET via Supertest)', () => {
  it('renderiza a fila de validação', async () => {
    await esperaViewHtml('/validacao');
  });

  it('renderiza o detalhe de validação de um parceiro pendente', async () => {
    const res = await esperaViewHtml(`/validacao/${parceiroId}`);
    expect(res.text).toContain('Parceiro Views HTML');
  });
});
