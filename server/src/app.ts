import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './modules/auth/auth.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'fitsphere-server' });
  });

  app.use('/api/auth', authRoutes);

  // Error handler must be last.
  app.use(errorHandler);

  return app;
}
