import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import {
  cadastrarParceiro,
  editarParceiro as editarParceiroService,
  obterTerrasDoParceiro,
  obterParceiros,
  obterParceiroPorId as obterParceiroPorIdService,
  vincularTerraAoParceiro as vincularTerraAoParceiroService,
} from '../services/parceiroService';
import { AppError, NotFoundError, ValidationError } from '../errors/AppError';
import { listarParceirosFiltrosSchema } from '../schemas/parceiroFiltros.schema';
import { vincularTerraAoParceiroSchema } from '../schemas/parceiroTerra.schema';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

// ─── API JSON ────────────────────────────────────────────────────────────────

export const createParceiro = asyncHandler(async (req: Request, res: Response) => {
  const { nome, tipo_pessoa, cpf_cnpj, criado_por, apelido, email, data_nascimento, nome_acompanhante } = req.body;

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
    apelido,
    email,
    data_nascimento,
    nome_acompanhante,
  });

  res.status(201).json(parceiro);
});

export const editarParceiro = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { nome, apelido, tipo_pessoa, cpf_cnpj, email, data_nascimento, nome_acompanhante, status, atualizado_por } = req.body;

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
  const { nome, tipo_pessoa, cpf_cnpj, apelido, email, data_nascimento, nome_acompanhante } = req.body;

  try {
    if (!nome || !tipo_pessoa || !cpf_cnpj) {
      throw new ValidationError('Preencha os campos obrigatórios: nome, tipo_pessoa e CPF/CNPJ');
    }
    if (!['fisica', 'juridica'].includes(tipo_pessoa)) {
      throw new ValidationError('tipo_pessoa deve ser "fisica" ou "juridica"');
    }

    await cadastrarParceiro({
      nome,
      tipo_pessoa,
      cpf_cnpj,
      criado_por: SEED_USER_ID,
      apelido: apelido || undefined,
      email: email || undefined,
      data_nascimento: data_nascimento || undefined,
      nome_acompanhante: nome_acompanhante || undefined,
    });

    res.redirect('/parceiros');
  } catch (err) {
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao cadastrar parceiro';
    res.status(err instanceof AppError ? err.statusCode : 500).render('parceiros/new', {
      error: mensagem,
      dados: req.body,
    });
  }
});

export const renderListaParceiros = asyncHandler(async (_req: Request, res: Response) => {
  const parceiros = await obterParceiros();
  res.render('parceiros/index', { parceiros });
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
  const { nome, apelido, tipo_pessoa, cpf_cnpj, email, data_nascimento, nome_acompanhante, status } = req.body;

  const camposEditaveis: Record<string, unknown> = {};
  if (nome) camposEditaveis.nome = nome;
  if (apelido) camposEditaveis.apelido = apelido;
  if (tipo_pessoa) camposEditaveis.tipo_pessoa = tipo_pessoa;
  if (cpf_cnpj) camposEditaveis.cpf_cnpj = cpf_cnpj;
  if (email) camposEditaveis.email = email;
  if (data_nascimento) camposEditaveis.data_nascimento = data_nascimento;
  if (nome_acompanhante) camposEditaveis.nome_acompanhante = nome_acompanhante;
  if (status) camposEditaveis.status = status;

  try {
    if (Object.keys(camposEditaveis).length === 0) {
      throw new ValidationError('Preencha ao menos um campo para alterar');
    }
    if (tipo_pessoa && !['fisica', 'juridica'].includes(tipo_pessoa)) {
      throw new ValidationError('tipo_pessoa deve ser "fisica" ou "juridica"');
    }

    await editarParceiroService(id, { ...camposEditaveis, atualizado_por: SEED_USER_ID });

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
