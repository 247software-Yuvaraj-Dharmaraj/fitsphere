import { Router } from 'express';
import * as controller from './analytics.controller.js';
import { asyncHandler } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

// Analytics is Admin/Trainer only.
router.use(requireAuth, requireRole('ADMIN', 'TRAINER'));

router.get('/overview', asyncHandler(controller.overview));
router.get('/members', asyncHandler(controller.members));

export default router;
