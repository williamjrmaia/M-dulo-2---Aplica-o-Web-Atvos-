import { Router } from 'express';
import {
  aprovarParceiro,
  createParceiro,
  devolverParceiro,
  editarParceiro,
  enviarParceiroParaValidacao,
  listarHistoricoParceiro,
  listarParceiros,
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
import { requireAuth } from '../middlewares/requireAuth';

// ─── API JSON (montado em /api/parceiros) ────────────────────────────────────
export const apiRouter = Router();

apiRouter.use(requireAuth);
apiRouter.post('/', createParceiro);
apiRouter.patch('/:id', editarParceiro);
apiRouter.get('/', listarParceiros);
apiRouter.put('/:id/aprovar', aprovarParceiro);
apiRouter.put('/:id/devolver', devolverParceiro);
apiRouter.put('/:id/validacao', enviarParceiroParaValidacao);
apiRouter.get('/:id/historico', listarHistoricoParceiro);
apiRouter.get('/:id/terras', listarTerrasDoParceiro);
apiRouter.post('/:id/terras', vincularTerraAoParceiro);
apiRouter.get('/:id', obterParceiroPorId);

// ─── Views HTML (montado em /parceiros) ──────────────────────────────────────
export const viewRouter = Router();

viewRouter.use(requireAuth);
viewRouter.get('/novo', renderFormCadastro);
viewRouter.post('/', processarCadastro);
viewRouter.get('/', renderListaParceiros);
viewRouter.get('/:id/editar', renderFormEdicao);
viewRouter.post('/:id/editar', processarEdicao);
viewRouter.get('/:id', renderDetalheParceiro);
