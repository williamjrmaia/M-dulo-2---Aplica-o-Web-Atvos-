import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import { cadastrarParceiro } from '../services/parceiroService';
import { AppError, ValidationError } from '../errors/AppError';

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
