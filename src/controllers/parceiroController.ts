import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import { cadastrarParceiro } from '../services/parceiroService';
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