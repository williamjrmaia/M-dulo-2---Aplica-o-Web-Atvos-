import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardInteracoesController';
import { DashboardService } from '../services/dashboardInteracoesService';
import { DashboardRepository } from '../repositories/dashboardInteracoesRepository';
import { requireAuth } from '../middlewares/requireAuth';

const router = Router();

const dashboardRepository = new DashboardRepository();
const dashboardService = new DashboardService(dashboardRepository);
const dashboardController = new DashboardController(dashboardService);

router.use(requireAuth);

// GET /dashboards/interacoes — Fluxo 15
router.get('/dashboards/interacoes', (req, res) =>
  dashboardController.getDashboardInteracoes(req, res)
);

export default router;
