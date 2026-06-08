import express from 'express';
import path from 'path';
import {
  apiRouter as parceiroApiRoutes,
  viewRouter as parceiroViewRoutes,
} from './routes/parceiroRoutes';
import { apiRouter as terraApiRoutes } from './routes/terra.routes';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes/index';

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);
app.use('/api/parceiros', parceiroApiRoutes);
app.use('/parceiros', parceiroViewRoutes);
app.use('/api/terras', terraApiRoutes);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Recurso não encontrado' });
    return;
  }
  res.status(404).render('errors/404');
});

app.use(errorHandler);

export default app;
