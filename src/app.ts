import express from 'express';
import path from 'path';
import parceiroRoutes from './routes/parceiroRoutes';
import parceiroViewRoutes from './routes/parceiroViewRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/parceiros', parceiroRoutes);
app.use('/parceiros', parceiroViewRoutes);
app.use(errorHandler);

export default app;