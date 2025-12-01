import express from 'express';
import { body } from 'express-validator';
import * as weatherController from '../controllers/weather';
import { authenticateDevice, authenticateUser } from '../middleware/auth';

const router = express.Router();

// ESP32 POST weather data
router.post(
  '/',
  authenticateDevice,
  [
    body('temperature').isNumeric(),
    body('humidity').isNumeric(),
    body('pressure').isNumeric(),
    body('rain_level').isNumeric(),
    body('wind_speed').isNumeric(),
  ],
  weatherController.receiveData
);

// User: Get realtime data
router.get('/realtime/:deviceId', authenticateUser, weatherController.getRealtimeData);

// User: Get historical data
router.get('/history/:deviceId', authenticateUser, weatherController.getHistory);

// User: Get statistics
router.get('/stats/:deviceId', authenticateUser, weatherController.getStats);

export default router;
