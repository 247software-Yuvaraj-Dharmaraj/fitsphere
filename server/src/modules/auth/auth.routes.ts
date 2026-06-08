import { Router } from 'express';
import * as authController from './auth.controller.js';
import { asyncHandler } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/signup', asyncHandler(authController.signup));
router.post('/signin', asyncHandler(authController.signin));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));

export default router;
