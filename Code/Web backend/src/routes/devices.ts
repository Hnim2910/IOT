import express from 'express';
import { body } from 'express-validator';
import * as devicesController from '../controllers/devices';
import { authenticateUser, authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// Admin: Get all devices
router.get('/all', authenticateAdmin, devicesController.getAllDevices);

// User: Get own device
router.get('/me', authenticateUser, devicesController.getUserDevice);

// ESP32: Generate pairing code (no auth needed - called by ESP32)
router.post(
  '/generate-pairing-code',
  [body('macAddress').matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/)],
  devicesController.generatePairingCode
);

// User: Pair device with pairing code
router.post(
  '/pair',
  authenticateUser,
  [body('pairingCode').isLength({ min: 6, max: 10 }).trim()],
  devicesController.pairDevice
);

// User: Unpair device
router.post('/unpair', authenticateUser, devicesController.unpairDevice);

// User: Register new device (admin method)
router.post(
  '/',
  authenticateUser,
  [
    body('deviceName').notEmpty().trim(),
    body('macAddress').matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/)
  ],
  devicesController.registerDevice
);

// User: Update device
router.put('/:deviceId', authenticateUser, devicesController.updateDevice);

// User: Delete device
router.delete('/:deviceId', authenticateUser, devicesController.deleteDevice);

export default router;
