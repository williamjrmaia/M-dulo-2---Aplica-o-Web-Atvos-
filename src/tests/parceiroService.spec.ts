import { randomUUID } from 'crypto';
import {
  cadastrarParceiro,
  editarParceiro,
  obterParceiroPorId,
  enviarParceiroParaValidacao,
  aprovarParceiro,
  devolverParceiro,
} from '../services/parceiroService';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail } from './helpers/usuarios';

const EMAIL = 'itg.svc.parceiro@atvos.test';
let perfis: Record<string, string>;
let usuarioId: string;
const parceirosCriados = new Set<string>();

beforeAll(async () => {
  perfis = await garantirPerfis();
});

beforeEach(async () => {
  const u = await criarUsuario({ email: EMAIL, perfilId: perfis.analista });
  usuarioId = u.id; // FK criado_por / atualizado_por / aprovado_por / devolvido_por
});

afterEach(async () => {
  const ids = Array.from(parceirosCriados);
  if (ids.length > 0) {
    await pool.query(`DELETE FROM registro_alteracao WHERE entidade_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM parceiros WHERE id = ANY($1::uuid[])`, [ids]);
  }
  await removerUsuarioPorEmail(EMAIL);
  parceirosCriados.clear();
});

afterAll(async () => {
  await pool.end();
});

// Arrange auxiliar: cria um parceiro num status controlado, direto no banco.
async function criarParceiroNoBanco(status = 'rascunho') {
  const { rows } = await pool.query<{ id: string; status: string }>(
    `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, email, status, criado_por)
     VALUES ($1, 'fisica', $2, $3, $4::status_validacao, $5)
     RETURNING id, status`,
    [`Parceiro ${randomUUID()}`, randomUUID(), `p_${randomUUID()}@atvos.test`, status, usuarioId]
  );
  parceirosCriados.add(rows[0].id);
  return rows[0];
}

describe('parceiroService (unitário, banco real) — caminhos de sucesso', () => {
  // CT01 → RN10 (RF004): cadastro de parceiro em rascunho
  it('cadastra um parceiro novo e persiste no banco com status rascunho', async () => {
    // Arrange
    const cpf = randomUUID();

    // Act
    const parceiro = await cadastrarParceiro({
      nome: 'Fazenda São João',
      tipo_pessoa: 'fisica',
      cpf_cnpj: cpf,
      email: `novo_${cpf}@atvos.test`,
      criado_por: usuarioId,
    });
    parceirosCriados.add(parceiro.id);

    // Assert — retorno
    expect(parceiro.id).toBeDefined();
    expect(parceiro.nome).toBe('Fazenda São João');
    expect(parceiro.status).toBe('rascunho');

    // Assert — persistência
    const { rows } = await pool.query('SELECT nome, status FROM parceiros WHERE id = $1', [parceiro.id]);
    expect(rows[0].nome).toBe('Fazenda São João');
    expect(rows[0].status).toBe('rascunho');
  });

  // CT02 → RN05 (RF005): edição de parceiro
  it('edita um parceiro existente e persiste a alteração', async () => {
    // Arrange
    const parceiro = await criarParceiroNoBanco('rascunho');

    // Act
    const atualizado = await editarParceiro(parceiro.id, {
      nome: 'Fazenda Renomeada',
      apelido: 'Sítio Novo',
      atualizado_por: usuarioId,
    });

    // Assert — retorno
    expect(atualizado.id).toBe(parceiro.id);
    expect(atualizado.nome).toBe('Fazenda Renomeada');
    expect(atualizado.apelido).toBe('Sítio Novo');

    // Assert — persistência
    const { rows } = await pool.query('SELECT nome, apelido FROM parceiros WHERE id = $1', [parceiro.id]);
    expect(rows[0].nome).toBe('Fazenda Renomeada');
    expect(rows[0].apelido).toBe('Sítio Novo');
  });

  // CT03 → RN04 (RF008): consulta de parceiro por id
  it('retorna um parceiro existente pelo id', async () => {
    // Arrange
    const parceiro = await criarParceiroNoBanco('rascunho');

    // Act
    const encontrado = await obterParceiroPorId(parceiro.id);

    // Assert — retorno coerente com o banco
    expect(encontrado.id).toBe(parceiro.id);
    expect(encontrado.status).toBe('rascunho');
  });

  // CT04 → RN16 (RF021): transição rascunho/devolvido → pendente
  it('envia um parceiro em rascunho para validação (rascunho → pendente)', async () => {
    // Arrange
    const parceiro = await criarParceiroNoBanco('rascunho');

    // Act
    const enviado = await enviarParceiroParaValidacao(parceiro.id, {
      atualizado_por: usuarioId,
      comentario: 'Enviar para o coordenador',
    });

    // Assert — retorno
    expect(enviado.id).toBe(parceiro.id);
    expect(enviado.status).toBe('pendente');

    // Assert — persistência
    const { rows } = await pool.query('SELECT status FROM parceiros WHERE id = $1', [parceiro.id]);
    expect(rows[0].status).toBe('pendente');
  });

  // CT05 → RN17 (RF022): transição pendente → ativo
  it('aprova um parceiro pendente (pendente → ativo)', async () => {
    // Arrange
    const parceiro = await criarParceiroNoBanco('pendente');

    // Act
    const aprovado = await aprovarParceiro(parceiro.id, {
      aprovado_por: usuarioId,
      comentario: 'Documentação conferida',
    });

    // Assert — retorno
    expect(aprovado.id).toBe(parceiro.id);
    expect(aprovado.status).toBe('ativo');

    // Assert — persistência
    const { rows } = await pool.query('SELECT status FROM parceiros WHERE id = $1', [parceiro.id]);
    expect(rows[0].status).toBe('ativo');
  });

  // CT06 → RN17 (RF023): transição pendente → devolvido
  it('devolve um parceiro pendente para ajuste (pendente → devolvido)', async () => {
    // Arrange
    const parceiro = await criarParceiroNoBanco('pendente');

    // Act
    const devolvido = await devolverParceiro(parceiro.id, {
      devolvido_por: usuarioId,
      comentario: 'Ajustar cpf_cnpj',
    });

    // Assert — retorno
    expect(devolvido.id).toBe(parceiro.id);
    expect(devolvido.status).toBe('devolvido');

    // Assert — persistência
    const { rows } = await pool.query('SELECT status FROM parceiros WHERE id = $1', [parceiro.id]);
    expect(rows[0].status).toBe('devolvido');
  });
});
