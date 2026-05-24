import express from 'express';
import parceiroRoutes from './routes/parceiroRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(express.json());
app.use('/api/parceiros', parceiroRoutes);
app.use(errorHandler);

export default app;