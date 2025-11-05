import express from 'express';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/verify
router.post('/verify', authController.verify);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/resend-verification
router.post('/resend-verification', authController.resendVerification);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// POST /api/auth/logout
router.post('/logout', authController.logout);

export default router;