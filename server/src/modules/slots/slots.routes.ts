import { Router } from 'express';
import * as controller from './slots.controller.js';
import { asyncHandler } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/my-bookings', asyncHandler(controller.myBookings));
router.post('/:id/book', asyncHandler(controller.book));
router.delete('/:id/book', asyncHandler(controller.cancel));
router.post('/:id/waitlist', asyncHandler(controller.joinWaitlist));
router.delete('/:id/waitlist', asyncHandler(controller.leaveWaitlist));

// Slot configuration is Admin/Trainer only (mirrors the product roles).
router.post('/', requireRole('ADMIN', 'TRAINER'), asyncHandler(controller.create));
router.post('/bulk-delete', requireRole('ADMIN', 'TRAINER'), asyncHandler(controller.bulkRemove));
router.patch('/:id', requireRole('ADMIN', 'TRAINER'), asyncHandler(controller.update));
router.delete('/:id', requireRole('ADMIN', 'TRAINER'), asyncHandler(controller.remove));

export default router;
