import { Router } from 'express';
import * as controller from './feedback.controller.js';
import { asyncHandler } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Members read their own feedback timeline.
router.get('/me', asyncHandler(controller.mine));

// Trainer/Admin: write feedback, list members, view a member's feedback.
router.post('/', requireRole('ADMIN', 'TRAINER'), asyncHandler(controller.create));
router.get('/members', requireRole('ADMIN', 'TRAINER'), asyncHandler(controller.members));
router.get('/member/:memberId', requireRole('ADMIN', 'TRAINER'), asyncHandler(controller.forMember));

export default router;
