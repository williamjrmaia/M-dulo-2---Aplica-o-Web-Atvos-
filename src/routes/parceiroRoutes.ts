import { Router } from 'express';
import {
  aprovarParceiro,
  createParceiro,
  devolverParceiro,
  editarParceiro,
  enviarParceiroParaValidacao,
  listarHistoricoParceiro,
  listarParceiros,
  listarRascunhosDevolvidosAnalista,
  listarTerrasDoParceiro,
  obterParceiroPorId,
  renderFormCadastro,
  processarCadastro,
  renderListaParceiros,
  renderDetalheParceiro,
  renderFormEdicao,
  processarEdicao,
  vincularTerraAoParceiro,
} from '../controllers/parceiroController';
import { authorizeRoles, requireAuth } from '../middlewares/requireAuth';

// ─── API JSON (montado em /api/parceiros) ────────────────────────────────────
export const apiRouter = Router();

apiRouter.use(requireAuth);
apiRouter.post('/', authorizeRoles('analista', 'administrador'), createParceiro);
apiRouter.patch('/:id', authorizeRoles('analista', 'administrador'), editarParceiro);
apiRouter.get('/', authorizeRoles('analista', 'coordenador', 'administrador'), listarParceiros);
apiRouter.get('/rascunhos-devolvidos', authorizeRoles('analista', 'administrador'), listarRascunhosDevolvidosAnalista);
apiRouter.put('/:id/aprovar', authorizeRoles('coordenador', 'administrador'), aprovarParceiro);
apiRouter.put('/:id/devolver', authorizeRoles('coordenador', 'administrador'), devolverParceiro);
apiRouter.put('/:id/validacao', authorizeRoles('analista', 'administrador'), enviarParceiroParaValidacao);
apiRouter.get('/:id/historico', authorizeRoles('analista', 'coordenador', 'administrador'), listarHistoricoParceiro);
apiRouter.get('/:id/terras', authorizeRoles('analista', 'coordenador', 'administrador'), listarTerrasDoParceiro);
apiRouter.post('/:id/terras', authorizeRoles('analista', 'administrador'), vincularTerraAoParceiro);
apiRouter.get('/:id', authorizeRoles('analista', 'coordenador', 'administrador'), obterParceiroPorId);

// ─── Views HTML (montado em /parceiros) ──────────────────────────────────────
export const viewRouter = Router();

viewRouter.use(requireAuth);
viewRouter.get('/novo', authorizeRoles('analista', 'administrador'), renderFormCadastro);
viewRouter.post('/', authorizeRoles('analista', 'administrador'), processarCadastro);
viewRouter.get('/', authorizeRoles('analista', 'coordenador', 'administrador'), renderListaParceiros);
viewRouter.get('/:id/editar', authorizeRoles('analista', 'administrador'), renderFormEdicao);
viewRouter.post('/:id/editar', authorizeRoles('analista', 'administrador'), processarEdicao);
viewRouter.get('/:id', authorizeRoles('analista', 'coordenador', 'administrador'), renderDetalheParceiro);
