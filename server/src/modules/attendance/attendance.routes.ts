import { Router } from 'express';
import * as controller from './attendance.controller.js';
import { asyncHandler } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth); // all attendance routes require a logged-in user

router.post('/check-in', asyncHandler(controller.checkIn));
router.post('/check-out', asyncHandler(controller.checkOut));
router.get('/summary', asyncHandler(controller.summary));
router.get('/month', asyncHandler(controller.month));
router.get('/occupancy', asyncHandler(controller.occupancy));
router.get('/trend', asyncHandler(controller.trend));

export default router;
