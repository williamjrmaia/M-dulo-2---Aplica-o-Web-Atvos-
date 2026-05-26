import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import { editarParceiro } from '../services/parceiroService';
import { AppError, ValidationError } from '../errors/AppError';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

export const renderFormEdicao = asyncHandler(async (req: Request, res: Response) => {
  res.render('parceiros/editar', { id: req.params.id, error: null, dados: {} });
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

    await editarParceiro(id, { ...camposEditaveis, atualizado_por: SEED_USER_ID });

    res.redirect('/parceiros');
  } catch (err) {
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao editar parceiro';
    res.status(err instanceof AppError ? err.statusCode : 500).render('parceiros/editar', {
      id,
      error: mensagem,
      dados: req.body,
    });
  }
});
