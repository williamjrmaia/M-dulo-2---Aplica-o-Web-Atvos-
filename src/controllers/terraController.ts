import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import {
  cadastrarTerra,
  editarTerra,
  excluirTerra as excluirTerraService,
  obterParceirosDaTerra,
  obterTerraPorId,
  obterTerras,
  vincularParceiroATerra as vincularParceiroATerraService,
} from '../services/terraService';
import { obterParceiros } from '../services/parceiroService';
import { createTerraSchema, updateTerraSchema } from '../schemas/terra.schema';
import { vincularParceiroATerraSchema } from '../schemas/terraParceiro.schema';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

type RequestComUsuario = Request & {
  usuario?: { id?: string; perfil?: string };
};

function perfilAtual(req: Request, res: Response): string | undefined {
  const perfil = (req as RequestComUsuario).usuario?.perfil ?? res.locals?.usuarioAutenticado?.perfil;
  return typeof perfil === 'string' ? perfil.trim().toLowerCase() : undefined;
}

function usuarioAtualId(req: Request, res: Response): string {
  return (
    (req as RequestComUsuario).usuario?.id ??
    res.locals.usuarioAutenticado?.id ??
    req.body.criado_por ??
    req.body.atualizado_por ??
    SEED_USER_ID
  );
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

export const createTerra = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createTerraSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const terra = await cadastrarTerra(parsed.data);

  res.status(201).location(`/api/terras/${terra.id}`).json(terra);
});

export const listarTerras = asyncHandler(async (_req: Request, res: Response) => {
  const terras = await obterTerras();
  res.status(200).json(terras);
});

export const updateTerra = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateTerraSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const perfilAutenticado = perfilAtual(req, res);
  validarStatusInativoCoordenador(perfilAutenticado, parsed.data.status);

  if (perfilAutenticado === 'analista' && parsed.data.status !== undefined) {
    const terraAtual = await obterTerraPorId(id);
    validarAlteracaoStatusAnalista(terraAtual.status, parsed.data.status);
  }

  const terra = await editarTerra(id, parsed.data);

  res.status(200).json(terra);
});

export const excluirTerra = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { atualizado_por, comentario } = req.body;

  if (perfilAtual(req, res) === 'coordenador') {
    throw new ForbiddenError('Coordenador não pode inativar registros');
  }

  if (!atualizado_por) {
    throw new ValidationError('Campos obrigatórios: atualizado_por');
  }

  const terra = await excluirTerraService(id, {
    atualizado_por,
    comentario: typeof comentario === 'string' && comentario.trim() ? comentario.trim() : undefined,
  });

  res.status(200).json(terra);
});

export const listarParceirosDaTerra = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parceiros = await obterParceirosDaTerra(id);
  res.status(200).json(parceiros);
});

export const vincularParceiroATerra = asyncHandler(async (req: Request, res: Response) => {
  const parsed = vincularParceiroATerraSchema.safeParse(req.body);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const vinculo = await vincularParceiroATerraService(id, parsed.data);

  res.status(201).location(`/api/terras/${id}/parceiros/${vinculo.parceiro_id}`).json(vinculo);
});

export const renderListaTerras = asyncHandler(async (req: Request, res: Response) => {
  const terras = await obterTerras();
  const info = typeof req.query.info === 'string' ? req.query.info : null;
  const error = typeof req.query.error === 'string' ? req.query.error : null;
  res.render('terras/index', { terras, info, error });
});

export const renderFormCadastroTerra = asyncHandler(async (_req: Request, res: Response) => {
  res.render('terras/new', { error: null, dados: {} });
});

export const processarCadastroTerra = asyncHandler(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    criado_por: usuarioAtualId(req, res),
  };
  const parsed = createTerraSchema.safeParse(payload);

  if (!parsed.success) {
    const detalhes = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return res.status(400).render('terras/new', { error: detalhes, dados: req.body });
  }

  try {
    await cadastrarTerra(parsed.data);
    return res.redirect('/terras?info=Terra%20cadastrada%20com%20sucesso');
  } catch (err) {
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao cadastrar terra';
    return res.status(err instanceof AppError ? err.statusCode : 500).render('terras/new', {
      error: mensagem,
      dados: req.body,
    });
  }
});

export const renderFormEdicaoTerra = asyncHandler(async (req: Request, res: Response) => {
  try {
    const terra = await obterTerraPorId(req.params.id as string);
    res.render('terras/edit', { terra, error: null, dados: terra });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).render('errors/404');
      return;
    }
    throw err;
  }
});

export const processarEdicaoTerra = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const payload = {
    ...req.body,
    status: req.body.status || undefined,
    atualizado_por: usuarioAtualId(req, res),
  };
  const parsed = updateTerraSchema.safeParse(payload);

  if (!parsed.success) {
    const terra = await obterTerraPorId(id).catch(() => null);
    const detalhes = parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return res.status(400).render('terras/edit', {
      terra,
      error: detalhes,
      dados: { id, ...req.body },
    });
  }

  try {
    const perfilAutenticado = perfilAtual(req, res);
    validarStatusInativoCoordenador(perfilAutenticado, parsed.data.status);

    if (perfilAutenticado === 'analista' && parsed.data.status !== undefined) {
      const terraAtual = await obterTerraPorId(id);
      validarAlteracaoStatusAnalista(terraAtual.status, parsed.data.status);
    }

    await editarTerra(id, parsed.data);
    return res.redirect('/terras?info=Terra%20atualizada%20com%20sucesso');
  } catch (err) {
    const terra = await obterTerraPorId(id).catch(() => null);
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao editar terra';
    return res.status(err instanceof AppError ? err.statusCode : 500).render('terras/edit', {
      terra,
      error: mensagem,
      dados: { id, ...req.body },
    });
  }
});

export const renderFormVinculoTerra = asyncHandler(async (req: Request, res: Response) => {
  const terra = await obterTerraPorId(req.params.id as string);
  const parceiros = await obterParceiros();
  res.render('terras/vincular', { terra, parceiros, error: null, dados: {} });
});

export const processarVinculoTerra = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const parsed = vincularParceiroATerraSchema.safeParse(req.body);
  if (!parsed.success) {
    const terra = await obterTerraPorId(id).catch(() => null);
    const parceiros = await obterParceiros();
    const detalhes = parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return res.status(400).render('terras/vincular', { terra, parceiros, error: detalhes, dados: req.body });
  }

  try {
    await vincularParceiroATerraService(id, parsed.data);
    return res.redirect(`/terras?info=${encodeURIComponent('Parceiro vinculado à terra com sucesso')}`);
  } catch (err) {
    const terra = await obterTerraPorId(id).catch(() => null);
    const parceiros = await obterParceiros();
    const mensagem = err instanceof AppError ? err.message : 'Erro inesperado ao vincular parceiro';
    return res.status(err instanceof AppError ? err.statusCode : 500).render('terras/vincular', {
      terra,
      parceiros,
      error: mensagem,
      dados: req.body,
    });
  }
});
