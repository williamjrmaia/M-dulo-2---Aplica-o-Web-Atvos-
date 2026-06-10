import { randomUUID } from 'crypto';
import {
  cadastrarParceiro,
  editarParceiro,
  obterParceiros,
  obterParceiroPorId,
  enviarParceiroParaValidacao,
  aprovarParceiro,
  devolverParceiro,
  excluirParceiro,
  obterHistoricoParceiro,
  obterTerrasDoParceiro,
  vincularTerraAoParceiro,
} from '../services/parceiroService';
import pool from '../config/connection';
import { garantirPerfis, criarUsuario, removerUsuarioPorEmail, ids } from './helpers/usuarios';

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

  it('inativa um parceiro e registra a exclusão lógica no histórico', async () => {
    const parceiro = await criarParceiroNoBanco('ativo');

    const inativado = await excluirParceiro(parceiro.id, {
      atualizado_por: usuarioId,
      comentario: 'Removido do cadastro operacional',
    });

    expect(inativado.id).toBe(parceiro.id);
    expect(inativado.status).toBe('inativo');

    const { rows } = await pool.query('SELECT status, atualizado_por FROM parceiros WHERE id = $1', [parceiro.id]);
    expect(rows[0]).toMatchObject({
      status: 'inativo',
      atualizado_por: usuarioId,
    });

    const { rows: historico } = await pool.query(
      `SELECT usuario_id, entidade_afetada, entidade_id, tipo_operacao, dados_anteriores, dados_novos, status, comentario
         FROM registro_alteracao
        WHERE entidade_id = $1
          AND tipo_operacao = 'exclusao'`,
      [parceiro.id]
    );

    expect(historico).toHaveLength(1);
    expect(historico[0]).toMatchObject({
      usuario_id: usuarioId,
      entidade_afetada: 'parceiro',
      entidade_id: parceiro.id,
      tipo_operacao: 'exclusao',
      status: 'aprovado',
      comentario: 'Removido do cadastro operacional',
    });
    expect(historico[0].dados_anteriores).toMatchObject({
      id: parceiro.id,
      status: 'ativo',
      criado_por: usuarioId,
    });
    expect(historico[0].dados_novos).toMatchObject({
      id: parceiro.id,
      status: 'inativo',
      atualizado_por: usuarioId,
    });
  });
});

describe('parceiroService (unitário, banco real) — caminhos de falha', () => {
  // CT07 → RN10 (RF004): cpf_cnpj duplicado é bloqueado
  it('bloqueia o cadastro de parceiro com cpf_cnpj duplicado', async () => {
    const cpf = randomUUID();
    const primeiro = await cadastrarParceiro({
      nome: 'Parceiro Original',
      tipo_pessoa: 'fisica',
      cpf_cnpj: cpf,
      email: `dup_${cpf}@atvos.test`,
      criado_por: usuarioId,
    });
    parceirosCriados.add(primeiro.id);

    await expect(
      cadastrarParceiro({
        nome: 'Parceiro Duplicado',
        tipo_pessoa: 'fisica',
        cpf_cnpj: cpf,
        email: `dup2_${cpf}@atvos.test`,
        criado_por: usuarioId,
      })
    ).rejects.toThrow('cpf_cnpj já cadastrado');
  });

  // CT08 → RN20 (RF005): edição de parceiro inexistente retorna não encontrado
  it('rejeita a edição de um parceiro inexistente', async () => {
    await expect(
      editarParceiro(ids.inexistente, { nome: 'Qualquer', atualizado_por: usuarioId })
    ).rejects.toThrow('Parceiro não encontrado');
  });

  // CT09 → RN08 (RF008): consulta de parceiro inexistente retorna não encontrado
  it('informa quando o parceiro consultado não existe', async () => {
    await expect(obterParceiroPorId(ids.inexistente)).rejects.toThrow('Parceiro não encontrado');
  });

  // CT10 → RN08 (RF008): id malformado é tratado como não encontrado
  it('trata id malformado como parceiro não encontrado', async () => {
    await expect(obterParceiroPorId(ids.malformado)).rejects.toThrow('Parceiro não encontrado');
  });

  // CT11 → RN16 (RF021): só rascunho/devolvido transita para pendente
  it('bloqueia o envio para validação de um parceiro que não está em rascunho ou devolvido', async () => {
    const parceiro = await criarParceiroNoBanco('ativo');
    await expect(
      enviarParceiroParaValidacao(parceiro.id, { atualizado_por: usuarioId })
    ).rejects.toThrow('rascunho ou devolvido');
  });

  // CT12 → RN17 (RF022): só pendente pode ser aprovado
  it('bloqueia a aprovação de um parceiro que não está pendente', async () => {
    const parceiro = await criarParceiroNoBanco('rascunho');
    await expect(
      aprovarParceiro(parceiro.id, { aprovado_por: usuarioId })
    ).rejects.toThrow('só pode ser aprovado quando estiver pendente');
  });

  // CT13 → RN17 (RF023): só pendente pode ser devolvido
  it('bloqueia a devolução de um parceiro que não está pendente', async () => {
    const parceiro = await criarParceiroNoBanco('rascunho');
    await expect(
      devolverParceiro(parceiro.id, { devolvido_por: usuarioId })
    ).rejects.toThrow('só pode ser devolvido quando estiver pendente');
  });

  // CT14 → RN12 (RF013): histórico de parceiro inexistente retorna não encontrado
  it('informa quando o histórico é pedido para um parceiro inexistente', async () => {
    await expect(obterHistoricoParceiro(ids.inexistente)).rejects.toThrow('Parceiro não encontrado');
  });

  // CT15 → RN13 (RF015): terras de parceiro inexistente retorna não encontrado
  it('informa quando as terras são pedidas para um parceiro inexistente', async () => {
    await expect(obterTerrasDoParceiro(ids.inexistente)).rejects.toThrow('Parceiro não encontrado');
  });

  // CT16 → RN14 (RF015): vínculo com terra inexistente é rejeitado
  it('rejeita o vínculo de um parceiro com uma terra inexistente', async () => {
    const parceiro = await criarParceiroNoBanco('rascunho');
    await expect(
      vincularTerraAoParceiro(parceiro.id, { terra_id: ids.inexistente })
    ).rejects.toThrow('terra_id não referencia uma terra existente');
  });

  // CT17 → RN16 (RF021): envio para validação de parceiro inexistente retorna não encontrado
  it('informa quando o envio para validação é de um parceiro inexistente', async () => {
    await expect(
      enviarParceiroParaValidacao(ids.inexistente, { atualizado_por: usuarioId })
    ).rejects.toThrow('Parceiro não encontrado');
  });

  // CT18 → RN17 (RF022): aprovação de parceiro inexistente retorna não encontrado
  it('informa quando a aprovação é de um parceiro inexistente', async () => {
    await expect(
      aprovarParceiro(ids.inexistente, { aprovado_por: usuarioId })
    ).rejects.toThrow('Parceiro não encontrado');
  });

  // CT19 → RN17 (RF023): devolução de parceiro inexistente retorna não encontrado
  it('informa quando a devolução é de um parceiro inexistente', async () => {
    await expect(
      devolverParceiro(ids.inexistente, { devolvido_por: usuarioId })
    ).rejects.toThrow('Parceiro não encontrado');
  });
});

describe('parceiroService (unitário, banco real) — cobertura das demais consultas', () => {
  // CT20 → RN04 (RF007): listagem de parceiros retorna os registros existentes
  it('lista parceiros existentes', async () => {
    const parceiro = await criarParceiroNoBanco('rascunho');
    const lista = await obterParceiros();
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.some((p) => p.id === parceiro.id)).toBe(true);
  });

  // CT21 → RN12 (RF013): histórico de parceiro existente retorna a lista de alterações
  it('retorna o histórico de um parceiro existente', async () => {
    const parceiro = await criarParceiroNoBanco('rascunho');
    await enviarParceiroParaValidacao(parceiro.id, {
      atualizado_por: usuarioId,
      comentario: 'Gerando histórico',
    });

    const historico = await obterHistoricoParceiro(parceiro.id);
    expect(Array.isArray(historico)).toBe(true);
    expect(historico.length).toBeGreaterThan(0);
    expect(historico[0].entidade_id).toBe(parceiro.id);
  });

  // CT22 → RN13 (RF015): terras de um parceiro existente retornam uma lista
  it('retorna as terras de um parceiro existente', async () => {
    const parceiro = await criarParceiroNoBanco('rascunho');
    const terras = await obterTerrasDoParceiro(parceiro.id);
    expect(Array.isArray(terras)).toBe(true);
  });
});

describe('parceiroService (unitário, banco real) — id malformado e unicidade', () => {
  // CT23 → RN10 (RF005): edição que gera cpf_cnpj duplicado é bloqueada
  it('bloqueia a edição que deixaria o cpf_cnpj duplicado', async () => {
    const cpfExistente = randomUUID();
    const original = await criarParceiroNoBanco('rascunho');
    const outro = await cadastrarParceiro({
      nome: 'Parceiro com CPF alvo',
      tipo_pessoa: 'fisica',
      cpf_cnpj: cpfExistente,
      email: `alvo_${cpfExistente}@atvos.test`,
      criado_por: usuarioId,
    });
    parceirosCriados.add(outro.id);

    await expect(
      editarParceiro(original.id, { cpf_cnpj: cpfExistente, atualizado_por: usuarioId })
    ).rejects.toThrow('cpf_cnpj ou email já cadastrado');
  });

  // CT24 → RN12 (RF013): id malformado no histórico é tratado como não encontrado
  it('trata id malformado no histórico como parceiro não encontrado', async () => {
    await expect(obterHistoricoParceiro(ids.malformado)).rejects.toThrow('Parceiro não encontrado');
  });

  // CT25 → RN13 (RF015): id malformado nas terras é tratado como não encontrado
  it('trata id malformado nas terras como parceiro não encontrado', async () => {
    await expect(obterTerrasDoParceiro(ids.malformado)).rejects.toThrow('Parceiro não encontrado');
  });

  // CT26 → RN16 (RF021): id malformado no envio é tratado como não encontrado
  it('trata id malformado no envio para validação como parceiro não encontrado', async () => {
    await expect(
      enviarParceiroParaValidacao(ids.malformado, { atualizado_por: usuarioId })
    ).rejects.toThrow('Parceiro não encontrado');
  });

  // CT27 → RN17 (RF022): id malformado na aprovação é tratado como não encontrado
  it('trata id malformado na aprovação como parceiro não encontrado', async () => {
    await expect(
      aprovarParceiro(ids.malformado, { aprovado_por: usuarioId })
    ).rejects.toThrow('Parceiro não encontrado');
  });

  // CT28 → RN17 (RF023): id malformado na devolução é tratado como não encontrado
  it('trata id malformado na devolução como parceiro não encontrado', async () => {
    await expect(
      devolverParceiro(ids.malformado, { devolvido_por: usuarioId })
    ).rejects.toThrow('Parceiro não encontrado');
  });
});
