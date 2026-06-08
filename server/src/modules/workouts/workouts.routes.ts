import { Router } from 'express';
import * as controller from './workouts.controller.js';
import { asyncHandler } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', asyncHandler(controller.log));
router.get('/', asyncHandler(controller.recent));
router.get('/stats', asyncHandler(controller.stats));

export default router;
