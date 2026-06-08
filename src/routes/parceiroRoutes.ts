/* ============================================================================
 * REVISÃO DO PROFESSOR — Semana 8 (Afonso) — COMENTÁRIO DE REVISÃO, NÃO ALTERA O CÓDIGO
 * 🔴 Nenhuma destas rotas (nem a API JSON em /api/parceiros, nem as views em
 * /parceiros) tem middleware de autenticação. Como o projeto já gera JWT + sessão
 * no login, qualquer um acessa/edita parceiros SEM estar logado. Para a entrega
 * de sexta, criar um requireAuth (verifica o JWT/sessão a partir do cookie/header)
 * e aplicá-lo a estas rotas (e às de usuários/terras).
 * ========================================================================== */
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

// ─── API JSON (montado em /api/parceiros) ────────────────────────────────────
export const apiRouter = Router();

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

viewRouter.get('/novo', renderFormCadastro);
viewRouter.post('/', processarCadastro);
viewRouter.get('/', renderListaParceiros);
viewRouter.get('/:id/editar', renderFormEdicao);
viewRouter.post('/:id/editar', processarEdicao);
viewRouter.get('/:id', renderDetalheParceiro);
