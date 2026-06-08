import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './modules/auth/auth.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import slotsRoutes from './modules/slots/slots.routes.js';
import workoutsRoutes from './modules/workouts/workouts.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'fitsphere-server' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/slots', slotsRoutes);
  app.use('/api/workouts', workoutsRoutes);

  // Error handler must be last.
  app.use(errorHandler);

  return app;
}
