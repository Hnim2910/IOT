import express from 'express';
import * as analyticsController from '../controllers/analytics';
import { authenticateUser, authenticateAdmin } from '../middleware/auth';

const router = express.Router();

// Admin: Get overview
router.get('/overview', authenticateAdmin, analyticsController.getOverview);

// Admin: Get device stats
router.get('/device/:deviceId', authenticateAdmin, analyticsController.getDeviceStats);

// Admin: Get all devices with data
router.get('/devices-data', authenticateAdmin, analyticsController.getDevicesWithData);

// User: Get own alerts
router.get('/alerts', authenticateUser, analyticsController.getUserAlerts);

// User: Mark alert as read
router.put('/alerts/:alertId/read', authenticateUser, analyticsController.markAlertRead);

// User: Clear read alerts
router.delete('/alerts/clear', authenticateUser, analyticsController.clearReadAlerts);

export default router;
