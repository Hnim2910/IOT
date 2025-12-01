import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty().trim()
  ],
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  authController.login
);

// Get current user
router.get('/me', authenticateUser, authController.getMe);

// Update settings
router.put('/settings', authenticateUser, authController.updateSettings);

export default router;
