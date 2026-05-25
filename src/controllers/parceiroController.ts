import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import { cadastrarParceiro, editarParceiro as editarParceiroService, obterParceiros, obterParceiroPorId as obterParceiroPorIdService } from '../services/parceiroService';
import { ValidationError } from '../errors/AppError';

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
  const { nome, apelido, tipo_pessoa, cpf_cnpj, email, data_nascimento, nome_acompanhante, status, atualizado_por
  } = req.body;

  if (atualizado_por === undefined) {
    throw new ValidationError('Campo obrigatório: atualizado_por');
  }

  if (nome === undefined && apelido === undefined && tipo_pessoa === undefined && cpf_cnpj === undefined && email === undefined && data_nascimento === undefined && nome_acompanhante === undefined && status === undefined) {
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
    atualizado_por
  });

  res.status(200).json(parceiro);
});

export const listarParceiros = asyncHandler(async (req: Request, res: Response) => {
  const parceiros = await obterParceiros();
  res.status(200).json(parceiros);
});

export const obterParceiroPorId = asyncHandler(async (req: Request, res: Response) => {
  const parceiro = await obterParceiroPorIdService(req.params.id as string);
  res.status(200).json(parceiro);
});