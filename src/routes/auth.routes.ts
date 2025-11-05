import express from 'express';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

// POST /api/v1/auth/register
router.post('/register', authController.register);

// POST /api/v1/auth/verify
router.post('/verify', authController.verify);

// POST /api/v1/auth/login
router.post('/login', authController.login);

// POST /api/v1/auth/resend-verification
router.post('/resend-verification', authController.resendVerification);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// POST /api/v1/auth/logout
router.post('/logout', authController.logout);

export default router;