import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import {
  aprovarParceiro as aprovarParceiroService,
  cadastrarParceiro,
  devolverParceiro as devolverParceiroService,
  editarParceiro as editarParceiroService,
  enviarParceiroParaValidacao as enviarParceiroParaValidacaoService,
  excluirParceiro as excluirParceiroService,
  obterHistoricoParceiro,
  obterPendentesValidacao,
  obterRascunhosDevolvidosDoAnalista,
  obterTerrasDoParceiro,
  obterParceiros,
  obterParceiroPorId as obterParceiroPorIdService,
  vincularTerraAoParceiro as vincularTerraAoParceiroService,
} from '../services/parceiroService';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';
import { InteracaoService } from '../services/interacaoService';
import { InteracaoRepository } from '../repositories/interacaoRepository';
import { listarParceirosFiltrosSchema } from '../schemas/parceiroFiltros.schema';
import { vincularTerraAoParceiroSchema } from '../schemas/parceiroTerra.schema';
import { aprovarParceiroSchema } from '../schemas/parceiroAprovacao.schema';
import { devolverParceiroSchema } from '../schemas/parceiroDevolucao.schema';
import { enviarParceiroValidacaoSchema } from '../schemas/parceiroValidacao.schema';
import { parseOrThrow } from '../helpers/validacaoZod';

const interacaoService = new InteracaoService(new InteracaoRepository());

type RequestComUsuario = Request & {
  usuario?: {
    id: string;
    perfil?: string;
  };
};

function perfilBruto(req: Request, res: Response): unknown {
  return (req as RequestComUsuario).usuario?.perfil ?? res.locals?.usuarioAutenticado?.perfil;
}

function obterPerfilAutenticado(req: Request, res: Response): string | undefined {
  const perfil = perfilBruto(req, res);
  return typeof perfil === 'string' ? perfil.trim().toLowerCase() : undefined;
}

function obterUsuarioAutenticadoId(req: Request): string {
  const usuarioId = (req as RequestComUsuario).usuario?.id;
  if (!usuarioId) {
    throw new ValidationError('Usuário autenticado não identificado');
  }

  return usuarioId;
}

function obterUsuarioAutenticadoIdOpcional(req: Request, res: Response): string | undefined {
  return (req as RequestComUsuario).usuario?.id ?? res.locals?.usuarioAutenticado?.id;
}

function textoOpcional(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text.length > 0 ? text : undefined;
}

function validarAlteracaoStatusAnalista(statusAtual: string, statusNovo: unknown): void {
  if (statusNovo === undefined || statusNovo === statusAtual) return;

  if (!(['rascunho', 'devolvido'].includes(statusAtual) && statusNovo === 'pendente')) {
    throw new ValidationError('Analista só pode enviar rascunhos ou devolvidos para validação');
  }
}

function validarStatusInativoCoordenador(perfil: string | undefined, statusNovo: unknown): void {
  if (perfil === 'coordenador' && statusNovo === 'inativo') {
    throw new ForbiddenError('Coordenador não pode inativar registros');
  }
}

function nenhumCampoFornecido(campos: Record<string, unknown>): boolean {
  return Object.values(campos).every((valor) => valor === undefined);
}

function mapErroParaRespostaView(err: unknown, mensagemPadrao: string): { status: number; mensagem: string } {
  const mensagem = err instanceof AppError ? err.message : mensagemPadrao;
  const status = err instanceof AppError ? err.statusCode : 500;
  return { status, mensagem };
}

const CAMPOS_EDITAVEIS_FORMULARIO = [
  'nome',
  'apelido',
  'tipo_pessoa',
  'cpf_cnpj',
  'email',
  'data_nascimento',
  'nome_acompanhante',
  'telefone',
  'regiao',
  'inscricao_estadual',
  'usina_referencia',
  'area_plantada',
  'tch_medio',
  'atr_medio',
  'observacoes',
  'papel',
  'status',
] as const;

function montarCamposEditaveis(body: Record<string, unknown>): Record<string, unknown> {
  const camposEditaveis: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITAVEIS_FORMULARIO) {
    if (body[campo]) camposEditaveis[campo] = body[campo];
  }
  return camposEditaveis;
}

function validarCamposObrigatoriosCadastro(nome: unknown, tipoPessoa: unknown, cpfCnpj: unknown): void {
  if (!nome || !tipoPessoa || !cpfCnpj) {
    throw new ValidationError('Preencha os campos obrigatórios: nome, tipo_pessoa e CPF/CNPJ');
  }
  if (!['fisica', 'juridica'].includes(tipoPessoa as string)) {
    throw new ValidationError('tipo_pessoa deve ser "fisica" ou "juridica"');
  }
}

function validarEmailParaValidacao(enviarParaValidacao: boolean, email: unknown): void {
  if (enviarParaValidacao && !email) {
    throw new ValidationError('Preencha o e-mail antes de enviar o parceiro para validação');
  }
}

function validarCadastroParceiro(
  nome: unknown,
  tipoPessoa: unknown,
  cpfCnpj: unknown,
  enviarParaValidacao: boolean,
  email: unknown
): void {
  validarCamposObrigatoriosCadastro(nome, tipoPessoa, cpfCnpj);
  validarEmailParaValidacao(enviarParaValidacao, email);
}

function validarEdicaoParceiro(camposEditaveis: Record<string, unknown>, tipoPessoa: unknown): void {
  if (Object.keys(camposEditaveis).length === 0) {
    throw new ValidationError('Preencha ao menos um campo para alterar');
  }
  if (tipoPessoa && !['fisica', 'juridica'].includes(tipoPessoa as string)) {
    throw new ValidationError('tipo_pessoa deve ser "fisica" ou "juridica"');
  }
}

function validarTipoPessoa(tipoPessoa: unknown): void {
  if (!['fisica', 'juridica'].includes(tipoPessoa as string)) {
    throw new ValidationError('tipo_pessoa deve ser "fisica" ou "juridica"');
  }
}

// Apenas letras (com espaços, acentos, apóstrofo, ponto e hífen) — para nomes de pessoa.
const REGEX_APENAS_LETRAS = /^[A-Za-zÀ-ÿ\s'.-]+$/;
// Apenas números e símbolos de máscara de telefone (parênteses, +, hífen, espaço).
const REGEX_TELEFONE = /^[0-9()+\-\s]+$/;

// Valida o formato de campos específicos do cadastro de parceiro:
// nome_acompanhante deve ter apenas letras; telefone apenas números (e máscara).
// Campos vazios/ausentes são ignorados (validação de obrigatoriedade é separada).
function validarFormatoCamposParceiro(campos: {
  nome_acompanhante?: unknown;
  telefone?: unknown;
}): void {
  const nomeAcompanhante = campos.nome_acompanhante;
  if (
    typeof nomeAcompanhante === 'string' &&
    nomeAcompanhante.trim() !== '' &&
    !REGEX_APENAS_LETRAS.test(nomeAcompanhante.trim())
  ) {
    throw new ValidationError('Nome do acompanhante deve conter apenas letras');
  }

  const telefone = campos.telefone;
  if (
    typeof telefone === 'string' &&
    telefone.trim() !== '' &&
    !REGEX_TELEFONE.test(telefone.trim())
  ) {
    throw new ValidationError('Telefone deve conter apenas números');
  }
}
const PAPEIS_VALIDOS = ['fornecedor', 'proprietario', 'ambos'] as const;
type PapelParceiro = (typeof PAPEIS_VALIDOS)[number];

// Normaliza o papel do parceiro (fornecedor | proprietario | ambos). Vazio/ausente
// vira undefined; valor inválido lança erro. "ambos" permite que um único CPF
// represente fornecedor e proprietário ao mesmo tempo.
function normalizarPapel(papel: unknown): PapelParceiro | undefined {
  if (papel === undefined || papel === null || papel === '') return undefined;
  if (typeof papel === 'string' && (PAPEIS_VALIDOS as readonly string[]).includes(papel)) {
    return papel as PapelParceiro;
  }
  throw new ValidationError('papel deve ser "fornecedor", "proprietario" ou "ambos"');
}

function validarEntradaCreateParceiro(
  nome: unknown,
  tipoPessoa: unknown,
  cpfCnpj: unknown,
  criadoPor: unknown
): void {
  if (!nome || !tipoPessoa || !cpfCnpj || !criadoPor) {
    throw new ValidationError('Campos obrigatórios: nome, tipo_pessoa, cpf_cnpj, criado_por');
  }
  validarTipoPessoa(tipoPessoa);
}

function statusInicialParceiro(status: unknown): 'pendente' | 'rascunho' {
  return status === 'pendente' ? 'pendente' : 'rascunho';
}

function comentarioDoBody(req: Request): string {
  return typeof req.body.comentario === 'string' ? req.body.comentario.trim() : '';
}

function statusDoErro(err: unknown): number {
  return err instanceof AppError ? err.statusCode : 500;
}

function mensagemDoErro(err: unknown, fallback: string): string {
  return err instanceof AppError ? err.message : fallback;
}

// ─── API JSON ────────────────────────────────────────────────────────────────

export const createParceiro = asyncHandler(async (req: Request, res: Response) => {
  const {
    nome,
    tipo_pessoa,
    cpf_cnpj,
    criado_por,
    apelido,
    email,
    data_nascimento,
    nome_acompanhante,
    telefone,
    regiao,
    inscricao_estadual,
    usina_referencia,
    area_plantada,
    tch_medio,
    atr_medio,
    observacoes,
    papel,
    status,
  } = req.body;

  validarEntradaCreateParceiro(nome, tipo_pessoa, cpf_cnpj, criado_por);
  validarFormatoCamposParceiro({ nome_acompanhante, telefone });

  const parceiro = await cadastrarParceiro({
    nome,
    tipo_pessoa,
    cpf_cnpj,
    criado_por,
    apelido: textoOpcional(apelido),
    email: textoOpcional(email),
    data_nascimento: textoOpcional(data_nascimento),
    nome_acompanhante: textoOpcional(nome_acompanhante),
    telefone: textoOpcional(telefone),
    regiao: textoOpcional(regiao),
    inscricao_estadual: textoOpcional(inscricao_estadual),
    usina_referencia: textoOpcional(usina_referencia),
    area_plantada: textoOpcional(area_plantada),
    tch_medio: textoOpcional(tch_medio),
    atr_medio: textoOpcional(atr_medio),
    observacoes: textoOpcional(observacoes),
    papel: normalizarPapel(papel),
    status: statusInicialParceiro(status),
  });

  res.status(201).json(parceiro);
});

export const editarParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const {
    nome,
    apelido,
    tipo_pessoa,
    cpf_cnpj,
    email,
    data_nascimento,
    nome_acompanhante,
    telefone,
    regiao,
    inscricao_estadual,
    usina_referencia,
    area_plantada,
    tch_medio,
    atr_medio,
    observacoes,
    status,
    atualizado_por,
  } = req.body;

  if (atualizado_por === undefined) {
    throw new ValidationError('Campo obrigatório: atualizado_por');
  }

  if (
    nenhumCampoFornecido({
      nome,
      apelido,
      tipo_pessoa,
      cpf_cnpj,
      email,
      data_nascimento,
      nome_acompanhante,
      telefone,
      regiao,
      inscricao_estadual,
      usina_referencia,
      area_plantada,
      tch_medio,
      atr_medio,
      observacoes,
      status,
    })
  ) {
    throw new ValidationError('Pelo menos um campo deve ser fornecido para atualização');
  }

  const perfilAutenticado = obterPerfilAutenticado(req, res);
  validarStatusInativoCoordenador(perfilAutenticado, status);

  const parceiroAtual = await obterParceiroPorIdService(id, {
    incluirInativos: perfilAutenticado === 'administrador',
    rascunhosUsuarioId: obterUsuarioAutenticadoIdOpcional(req, res),
  });

  if (perfilAutenticado === 'analista' && status !== undefined) {
    validarAlteracaoStatusAnalista(parceiroAtual.status, status);
  }

  const parceiro = await editarParceiroService(id, {
    nome,
    apelido,
    tipo_pessoa,
    cpf_cnpj,
    email,
    data_nascimento,
    nome_acompanhante,
    telefone,
    regiao,
    inscricao_estadual,
    usina_referencia,
    area_plantada,
    tch_medio,
    atr_medio,
    observacoes,
    status,
    atualizado_por,
  });

  res.status(200).json(parceiro);
});

export const listarParceiros = asyncHandler(async (req: Request, res: Response) => {
  const filtros = parseOrThrow(listarParceirosFiltrosSchema, req.query, 'query');

  const parceiros = await obterParceiros(filtros, {
    incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
    rascunhosUsuarioId: obterUsuarioAutenticadoIdOpcional(req, res),
  });
  res.status(200).json(parceiros);
});

export const listarRascunhosDevolvidosAnalista = asyncHandler(async (req: Request, res: Response) => {
  const analistaIdQuery = typeof req.query.analista_id === 'string' ? req.query.analista_id : undefined;
  const usuarioAutenticadoId = obterUsuarioAutenticadoIdOpcional(req, res) ?? analistaIdQuery;

  const parceiros = await obterRascunhosDevolvidosDoAnalista(usuarioAutenticadoId ?? '');
  res.status(200).json(parceiros);
});

export const obterParceiroPorId = asyncHandler(async (req: Request, res: Response) => {
  const parceiro = await obterParceiroPorIdService(req.params.id as string, {
    incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
    rascunhosUsuarioId: obterUsuarioAutenticadoIdOpcional(req, res),
  });
  res.status(200).json(parceiro);
});

export const listarHistoricoParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const historico = await obterHistoricoParceiro(id);
  res.status(200).json(historico);
});

export const enviarParceiroParaValidacao = asyncHandler(async (req: Request, res: Response) => {
  const dados = parseOrThrow(enviarParceiroValidacaoSchema, req.body);

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parceiro = await enviarParceiroParaValidacaoService(id, dados);

  res.status(200).json(parceiro);
});

export const aprovarParceiro = asyncHandler(async (req: Request, res: Response) => {
  const dados = parseOrThrow(aprovarParceiroSchema, req.body);

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parceiro = await aprovarParceiroService(id, dados);

  res.status(200).json(parceiro);
});

export const devolverParceiro = asyncHandler(async (req: Request, res: Response) => {
  const dados = parseOrThrow(devolverParceiroSchema, req.body);

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parceiro = await devolverParceiroService(id, dados);

  res.status(200).json(parceiro);
});

export const excluirParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { atualizado_por, comentario } = req.body;

  if (obterPerfilAutenticado(req, res) === 'coordenador') {
    throw new ForbiddenError('Coordenador não pode inativar registros');
  }

  if (!atualizado_por) {
    throw new ValidationError('Campos obrigatórios: atualizado_por');
  }

  const parceiro = await excluirParceiroService(id, {
    atualizado_por,
    comentario: textoOpcional(comentario),
  });

  res.status(200).json(parceiro);
});

export const listarTerrasDoParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const terras = await obterTerrasDoParceiro(id, {
    incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
  });
  res.status(200).json(terras);
});

export const vincularTerraAoParceiro = asyncHandler(async (req: Request, res: Response) => {
  const dados = parseOrThrow(vincularTerraAoParceiroSchema, req.body);

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const vinculo = await vincularTerraAoParceiroService(id, dados);

  res.status(201).location(`/api/parceiros/${id}/terras/${vinculo.terra_id}`).json(vinculo);
});

// ─── Views HTML ──────────────────────────────────────────────────────────────

export const renderFormCadastro = asyncHandler(async (_req: Request, res: Response) => {
  res.render('parceiros/new', { error: null, dados: {} });
});

export const processarCadastro = asyncHandler(async (req: Request, res: Response) => {
  const {
    nome,
    tipo_pessoa,
    cpf_cnpj,
    apelido,
    email,
    data_nascimento,
    nome_acompanhante,
    telefone,
    regiao,
    inscricao_estadual,
    usina_referencia,
    area_plantada,
    tch_medio,
    atr_medio,
    observacoes,
    papel,
    acao,
  } = req.body;
  const enviarParaValidacao = acao === 'validacao';
  const usuarioId = obterUsuarioAutenticadoId(req);

  try {
    validarCadastroParceiro(nome, tipo_pessoa, cpf_cnpj, enviarParaValidacao, email);
    validarFormatoCamposParceiro({ nome_acompanhante, telefone });

    await cadastrarParceiro({
      nome,
      tipo_pessoa,
      cpf_cnpj,
      criado_por: usuarioId,
      apelido: textoOpcional(apelido),
      email: textoOpcional(email),
      data_nascimento: textoOpcional(data_nascimento),
      nome_acompanhante: textoOpcional(nome_acompanhante),
      telefone: textoOpcional(telefone),
      regiao: textoOpcional(regiao),
      inscricao_estadual: textoOpcional(inscricao_estadual),
      usina_referencia: textoOpcional(usina_referencia),
      area_plantada: textoOpcional(area_plantada),
      tch_medio: textoOpcional(tch_medio),
      atr_medio: textoOpcional(atr_medio),
      observacoes: textoOpcional(observacoes),
      papel: normalizarPapel(papel),
      status: enviarParaValidacao ? 'pendente' : 'rascunho',
    });

    const info = enviarParaValidacao
      ? 'Parceiro enviado para validação.'
      : 'Rascunho salvo com sucesso.';
    res.redirect(`/parceiros?info=${encodeURIComponent(info)}`);
  } catch (err) {
    const { status, mensagem } = mapErroParaRespostaView(err, 'Erro inesperado ao cadastrar parceiro');
    res.status(status).render('parceiros/new', {
      error: mensagem,
      dados: req.body,
    });
  }
});

export const renderListaParceiros = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listarParceirosFiltrosSchema.safeParse(req.query);
  const filtros = parsed.success ? parsed.data : {};
  const parceiros = await obterParceiros(filtros, {
    incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
    rascunhosUsuarioId: obterUsuarioAutenticadoIdOpcional(req, res),
  });
  const info = typeof req.query.info === 'string' ? req.query.info : null;
  const error = parsed.success ? null : 'Filtros inválidos. Revise os campos informados.';
  res.render('parceiros/index', { parceiros, filtros, info, error });
});

export const renderDetalheParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const usuarioId = obterUsuarioAutenticadoIdOpcional(req, res);
    const parceiro = await obterParceiroPorIdService(id, {
      incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
      rascunhosUsuarioId: usuarioId,
    });
    // Carrega as interações registradas para exibir no "Histórico de Interações".
    const interacoes = await interacaoService.listarInteracoesPorParceiro(id);
    res.render('parceiros/show', { parceiro, interacoes, usuarioId, naoEncontrado: false });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).render('parceiros/show', { parceiro: null, naoEncontrado: true });
      return;
    }
    throw err;
  }
});

export const renderFormEdicao = asyncHandler(async (req: Request, res: Response) => {
  try {
    const parceiro = await obterParceiroPorIdService(req.params.id as string, {
      incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
      rascunhosUsuarioId: obterUsuarioAutenticadoIdOpcional(req, res),
    });
    res.render('parceiros/edit', { id: req.params.id, error: null, dados: parceiro });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).render('errors/404');
      return;
    }
    throw err;
  }
});

export const processarEdicao = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { tipo_pessoa, status } = req.body;
  const usuarioId = obterUsuarioAutenticadoId(req);
  const camposEditaveis = montarCamposEditaveis(req.body);

  try {
    validarEdicaoParceiro(camposEditaveis, tipo_pessoa);
    validarFormatoCamposParceiro(camposEditaveis);
    if (camposEditaveis.papel !== undefined) {
      camposEditaveis.papel = normalizarPapel(camposEditaveis.papel);
    }

    const perfilAutenticado = obterPerfilAutenticado(req, res);
    validarStatusInativoCoordenador(perfilAutenticado, status);

    const parceiroAtual = await obterParceiroPorIdService(id, {
      incluirInativos: perfilAutenticado === 'administrador',
      rascunhosUsuarioId: obterUsuarioAutenticadoIdOpcional(req, res),
    });

    if (perfilAutenticado === 'analista' && status) {
      validarAlteracaoStatusAnalista(parceiroAtual.status, status);
    }

    await editarParceiroService(id, { ...camposEditaveis, atualizado_por: usuarioId });

    res.redirect('/parceiros');
  } catch (err) {
    const { status: statusResposta, mensagem } = mapErroParaRespostaView(err, 'Erro inesperado ao editar parceiro');
    res.status(statusResposta).render('parceiros/edit', {
      id,
      error: mensagem,
      dados: req.body,
    });
  }
});

// ─── Views HTML: validação e revisão de registros ────────────────────────────

export const renderValidacao = asyncHandler(async (_req: Request, res: Response) => {
  const pendentes = await obterPendentesValidacao();
  res.render('parceiros/validacao', { pendentes });
});

export const renderRevisar = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const parceiro = await obterParceiroPorIdService(id);
    const terras = await obterTerrasDoParceiro(id, {
      incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
    }).catch(() => []);
    res.render('parceiros/revisar', { parceiro, terras, naoEncontrado: false, error: null });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).render('parceiros/revisar', { parceiro: null, terras: [], naoEncontrado: true, error: null });
      return;
    }
    throw err;
  }
});

export const aprovarParceiroViaFormulario = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const comentario = comentarioDoBody(req);
  const usuarioId = obterUsuarioAutenticadoId(req);
  try {
    await aprovarParceiroService(id, {
      aprovado_por: usuarioId,
      ...(comentario ? { comentario } : {}),
    });
    res.redirect('/validacao');
  } catch (err) {
    const mensagem = mensagemDoErro(err, 'Erro inesperado ao aprovar registro');
    const parceiro = await obterParceiroPorIdService(id).catch(() => null);
    const terras = await obterTerrasDoParceiro(id, {
      incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
    }).catch(() => []);
    res.status(statusDoErro(err)).render('parceiros/revisar', {
      parceiro,
      terras,
      naoEncontrado: !parceiro,
      error: mensagem,
    });
  }
});

export const devolverParceiroViaFormulario = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const comentario = comentarioDoBody(req);
  const usuarioId = obterUsuarioAutenticadoId(req);
  try {
    await devolverParceiroService(id, {
      devolvido_por: usuarioId,
      ...(comentario ? { comentario } : {}),
    });
    res.redirect('/validacao');
  } catch (err) {
    const mensagem = mensagemDoErro(err, 'Erro inesperado ao devolver registro');
    const parceiro = await obterParceiroPorIdService(id).catch(() => null);
    const terras = await obterTerrasDoParceiro(id, {
      incluirInativos: obterPerfilAutenticado(req, res) === 'administrador',
    }).catch(() => []);
    res.status(statusDoErro(err)).render('parceiros/revisar', {
      parceiro,
      terras,
      naoEncontrado: !parceiro,
      error: mensagem,
    });
  }
});
