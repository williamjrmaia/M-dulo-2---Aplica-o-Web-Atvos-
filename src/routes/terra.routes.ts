import { Router } from 'express';
import {
  createTerra,
  excluirTerra,
  listarParceirosDaTerra,
  listarTerras,
  processarCadastroTerra,
  processarEdicaoTerra,
  processarVinculoTerra,
  renderFormCadastroTerra,
  renderFormEdicaoTerra,
  renderFormVinculoTerra,
  renderListaTerras,
  updateTerra,
  vincularParceiroATerra,
} from '../controllers/terraController';
import { authorizeRoles, requireAuth } from '../middlewares/requireAuth';

// ─── API JSON (montado em /api/terras) ───────────────────────────────────────
export const apiRouter = Router();

apiRouter.use(requireAuth);
apiRouter.post('/', authorizeRoles('analista', 'administrador'), createTerra);
apiRouter.get('/', authorizeRoles('analista', 'coordenador', 'administrador'), listarTerras);
apiRouter.get('/:id/parceiros', authorizeRoles('analista', 'coordenador', 'administrador'), listarParceirosDaTerra);
apiRouter.post('/:id/parceiros', authorizeRoles('analista', 'administrador'), vincularParceiroATerra);
apiRouter.put('/:id', authorizeRoles('analista', 'administrador'), updateTerra);
apiRouter.delete('/:id', authorizeRoles('analista', 'administrador'), excluirTerra);

// ─── Views HTML (montado em /terras) ─────────────────────────────────────────
export const viewRouter = Router();

viewRouter.use(requireAuth);
viewRouter.get('/', authorizeRoles('analista', 'coordenador', 'administrador'), renderListaTerras);
viewRouter.get('/nova', authorizeRoles('analista', 'administrador'), renderFormCadastroTerra);
viewRouter.post('/', authorizeRoles('analista', 'administrador'), processarCadastroTerra);
viewRouter.get('/:id/editar', authorizeRoles('analista', 'administrador'), renderFormEdicaoTerra);
viewRouter.post('/:id/editar', authorizeRoles('analista', 'administrador'), processarEdicaoTerra);
viewRouter.get('/:id/vincular-parceiro', authorizeRoles('analista', 'administrador'), renderFormVinculoTerra);
viewRouter.post('/:id/parceiros', authorizeRoles('analista', 'administrador'), processarVinculoTerra);
