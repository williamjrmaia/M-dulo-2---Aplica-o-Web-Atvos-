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
  obterTerrasDoParceiro,
  obterParceiros,
  obterParceiroPorId as obterParceiroPorIdService,
  vincularTerraAoParceiro as vincularTerraAoParceiroService,
} from '../services/parceiroService';
import { AppError, NotFoundError, ValidationError } from '../errors/AppError';
import { listarParceirosFiltrosSchema } from '../schemas/parceiroFiltros.schema';
import { vincularTerraAoParceiroSchema } from '../schemas/parceiroTerra.schema';
import { aprovarParceiroSchema } from '../schemas/parceiroAprovacao.schema';
import { devolverParceiroSchema } from '../schemas/parceiroDevolucao.schema';
import { enviarParceiroValidacaoSchema } from '../schemas/parceiroValidacao.schema';

type RequestComUsuario = Request & {
  usuario?: {
    id: string;
  };
};

function obterUsuarioAutenticadoId(req: Request): string {
  const usuarioId = (req as RequestComUsuario).usuario?.id;
  if (!usuarioId) {
    throw new ValidationError('Usuário autenticado não identificado');
  }

  return usuarioId;
}

function textoOpcional(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text.length > 0 ? text : undefined;
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
    status,
  } = req.body;

  if (!nome || !tipo_pessoa || !cpf_cnpj || !criado_por) {
    throw new ValidationError('Campos obrigatórios: nome, tipo_pessoa, cpf_cnpj, criado_por');
  }

  if (!['fisica', 'juridica'].includes(tipo_pessoa)) {
    throw new ValidationError('tipo_pessoa deve ser "fisica" ou "juridica"');
  }

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
    status: status === 'pendente' ? 'pendente' : 'rascunho',
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
    nome === undefined &&
    apelido === undefined &&
    tipo_pessoa === undefined &&
    cpf_cnpj === undefined &&
    email === undefined &&
    data_nascimento === undefined &&
    nome_acompanhante === undefined &&
    telefone === undefined &&
    regiao === undefined &&
    inscricao_estadual === undefined &&
    usina_referencia === undefined &&
    area_plantada === undefined &&
    tch_medio === undefined &&
    atr_medio === undefined &&
    observacoes === undefined &&
    status === undefined
  ) {
    throw new ValidationError('Pelo menos um campo deve ser fornecido para atualização');
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
  const parsed = listarParceirosFiltrosSchema.safeParse(req.query);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'query'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const parceiros = await obterParceiros(parsed.data);
  res.status(200).json(parceiros);
});

export const obterParceiroPorId = asyncHandler(async (req: Request, res: Response) => {
  const parceiro = await obterParceiroPorIdService(req.params.id as string);
  res.status(200).json(parceiro);
});

export const listarHistoricoParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const historico = await obterHistoricoParceiro(id);
  res.status(200).json(historico);
});

export const enviarParceiroParaValidacao = asyncHandler(async (req: Request, res: Response) => {
  const parsed = enviarParceiroValidacaoSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parceiro = await enviarParceiroParaValidacaoService(id, parsed.data);

  res.status(200).json(parceiro);
});

export const aprovarParceiro = asyncHandler(async (req: Request, res: Response) => {
  const parsed = aprovarParceiroSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parceiro = await aprovarParceiroService(id, parsed.data);

  res.status(200).json(parceiro);
});

export const devolverParceiro = asyncHandler(async (req: Request, res: Response) => {
  const parsed = devolverParceiroSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parceiro = await devolverParceiroService(id, parsed.data);

  res.status(200).json(parceiro);
});

export const excluirParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { atualizado_por, comentario } = req.body;

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
  const terras = await obterTerrasDoParceiro(id);
  res.status(200).json(terras);
});

export const vincularTerraAoParceiro = asyncHandler(async (req: Request, res: Response) => {
  const parsed = vincularTerraAoParceiroSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const vinculo = await vincularTerraAoParceiroService(id, parsed.data);

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
    acao,
  } = req.body;
  const enviarParaValidacao = acao === 'validacao';
  const usuarioId = obterUsuarioAutenticadoId(req);

  try {
    if (!nome || !tipo_pessoa || !cpf_cnpj) {
      throw new ValidationError('Preencha os campos obrigatórios: nome, tipo_pessoa e CPF/CNPJ');
    }
    if (!['fisica', 'juridica'].includes(tipo_pessoa)) {
      throw new ValidationError('tipo_pessoa deve ser "fisica" ou "juridica"');
    }
    if (enviarParaValidacao && !email) {
      throw new ValidationError('Preencha o e-mail antes de enviar o parceiro para validação');
    }

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
      status: enviarParaValidacao ? 'pendente' : 'rascunho',
    });

    const info = enviarParaValidacao
      ? 'Parceiro enviado para validação.'
      : 'Rascunho salvo com sucesso.';
    res.redirect(`/parceiros?info=${encodeURIComponent(info)}`);
  } catch (err) {
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao cadastrar parceiro';
    res.status(err instanceof AppError ? err.statusCode : 500).render('parceiros/new', {
      error: mensagem,
      dados: req.body,
    });
  }
});

export const renderListaParceiros = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listarParceirosFiltrosSchema.safeParse(req.query);
  const filtros = parsed.success ? parsed.data : {};
  const parceiros = await obterParceiros(filtros);
  const info = typeof req.query.info === 'string' ? req.query.info : null;
  const error = parsed.success ? null : 'Filtros inválidos. Revise os campos informados.';
  res.render('parceiros/index', { parceiros, filtros, info, error });
});

export const renderDetalheParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const parceiro = await obterParceiroPorIdService(id);
    res.render('parceiros/show', { parceiro, naoEncontrado: false });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).render('parceiros/show', { parceiro: null, naoEncontrado: true });
      return;
    }
    throw err;
  }
});

export const renderFormEdicao = asyncHandler(async (req: Request, res: Response) => {
  res.render('parceiros/edit', { id: req.params.id, error: null, dados: {} });
});

export const processarEdicao = asyncHandler(async (req: Request, res: Response) => {
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
  } = req.body;
  const usuarioId = obterUsuarioAutenticadoId(req);

  const camposEditaveis: Record<string, unknown> = {};
  if (nome) camposEditaveis.nome = nome;
  if (apelido) camposEditaveis.apelido = apelido;
  if (tipo_pessoa) camposEditaveis.tipo_pessoa = tipo_pessoa;
  if (cpf_cnpj) camposEditaveis.cpf_cnpj = cpf_cnpj;
  if (email) camposEditaveis.email = email;
  if (data_nascimento) camposEditaveis.data_nascimento = data_nascimento;
  if (nome_acompanhante) camposEditaveis.nome_acompanhante = nome_acompanhante;
  if (telefone) camposEditaveis.telefone = telefone;
  if (regiao) camposEditaveis.regiao = regiao;
  if (inscricao_estadual) camposEditaveis.inscricao_estadual = inscricao_estadual;
  if (usina_referencia) camposEditaveis.usina_referencia = usina_referencia;
  if (area_plantada) camposEditaveis.area_plantada = area_plantada;
  if (tch_medio) camposEditaveis.tch_medio = tch_medio;
  if (atr_medio) camposEditaveis.atr_medio = atr_medio;
  if (observacoes) camposEditaveis.observacoes = observacoes;
  if (status) camposEditaveis.status = status;

  try {
    if (Object.keys(camposEditaveis).length === 0) {
      throw new ValidationError('Preencha ao menos um campo para alterar');
    }
    if (tipo_pessoa && !['fisica', 'juridica'].includes(tipo_pessoa)) {
      throw new ValidationError('tipo_pessoa deve ser "fisica" ou "juridica"');
    }

    await editarParceiroService(id, { ...camposEditaveis, atualizado_por: usuarioId });

    res.redirect('/parceiros');
  } catch (err) {
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao editar parceiro';
    res.status(err instanceof AppError ? err.statusCode : 500).render('parceiros/edit', {
      id,
      error: mensagem,
      dados: req.body,
    });
  }
});

// ─── Views HTML: validação e revisão de registros ────────────────────────────

export const renderValidacao = asyncHandler(async (_req: Request, res: Response) => {
  const todos = await obterParceiros();
  const pendentes = todos.filter((p) => p.status === 'pendente');
  res.render('parceiros/validacao', { pendentes });
});

export const renderRevisar = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const parceiro = await obterParceiroPorIdService(id);
    const terras = await obterTerrasDoParceiro(id).catch(() => []);
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
  const comentario = typeof req.body.comentario === 'string' ? req.body.comentario.trim() : '';
  const usuarioId = obterUsuarioAutenticadoId(req);
  try {
    await aprovarParceiroService(id, {
      aprovado_por: usuarioId,
      ...(comentario ? { comentario } : {}),
    });
    res.redirect('/validacao');
  } catch (err) {
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao aprovar registro';
    const parceiro = await obterParceiroPorIdService(id).catch(() => null);
    const terras = await obterTerrasDoParceiro(id).catch(() => []);
    res.status(err instanceof AppError ? err.statusCode : 500).render('parceiros/revisar', {
      parceiro,
      terras,
      naoEncontrado: !parceiro,
      error: mensagem,
    });
  }
});

export const devolverParceiroViaFormulario = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const comentario = typeof req.body.comentario === 'string' ? req.body.comentario.trim() : '';
  const usuarioId = obterUsuarioAutenticadoId(req);
  try {
    await devolverParceiroService(id, {
      devolvido_por: usuarioId,
      ...(comentario ? { comentario } : {}),
    });
    res.redirect('/validacao');
  } catch (err) {
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao devolver registro';
    const parceiro = await obterParceiroPorIdService(id).catch(() => null);
    const terras = await obterTerrasDoParceiro(id).catch(() => []);
    res.status(err instanceof AppError ? err.statusCode : 500).render('parceiros/revisar', {
      parceiro,
      terras,
      naoEncontrado: !parceiro,
      error: mensagem,
    });
  }
});
