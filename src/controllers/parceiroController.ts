import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import {
  cadastrarParceiro,
  editarParceiro as editarParceiroService,
  obterParceiros,
  obterParceiroPorId as obterParceiroPorIdService,
} from '../services/parceiroService';
import { AppError, NotFoundError, ValidationError } from '../errors/AppError';

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

export const listarParceiros = asyncHandler(async (_req: Request, res: Response) => {
  const parceiros = await obterParceiros();
  res.status(200).json(parceiros);
});

export const obterParceiroPorId = asyncHandler(async (req: Request, res: Response) => {
  const parceiro = await obterParceiroPorIdService(req.params.id as string);
  res.status(200).json(parceiro);
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
