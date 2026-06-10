import { Router } from 'express';
import { ExportaController } from '../controllers/exportaController';
import { ExportaService } from '../services/exportaService';
import { ExportaRepository } from '../repositories/exportaRepository';
import { authorizeRoles, requireAuth } from '../middlewares/requireAuth';

const router = Router();

const exportaRepository = new ExportaRepository();
const exportaService = new ExportaService(exportaRepository);
const exportaController = new ExportaController(exportaService);

router.use(requireAuth);
router.use(authorizeRoles('coordenador', 'administrador'));

// GET /parceiros/exportar — Fluxo 16
router.get('/parceiros/exportar', (req, res) =>
  exportaController.exportarParceiros(req, res)
);

export default router;
