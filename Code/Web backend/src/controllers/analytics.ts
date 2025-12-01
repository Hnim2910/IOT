import { Request, Response } from 'express';
import Reading from '../models/Reading';
import Device from '../models/Device';
import User from '../models/User';
import Alert from '../models/Alert';

// Admin: Get overview statistics
export const getOverview = async (req: Request, res: Response) => {
  try {
    // Total counts
    const totalUsers = await User.countDocuments();
    const totalDevices = await Device.countDocuments();
    const onlineDevices = await Device.countDocuments({ status: 'online' });
    const totalReadings = await Reading.countDocuments();

    // Recent readings (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentReadings = await Reading.countDocuments({
      timestamp: { $gte: oneHourAgo }
    });

    // Average temperature across all devices
    const avgStats = await Reading.aggregate([
      {
        $match: {
          timestamp: { $gte: oneHourAgo }
        }
      },
      {
        $group: {
          _id: null,
          avgTemp: { $avg: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgPressure: { $avg: '$pressure' }
        }
      }
    ]);

    res.json({
      totalUsers,
      totalDevices,
      onlineDevices,
      offlineDevices: totalDevices - onlineDevices,
      totalReadings,
      recentReadings,
      averageStats: avgStats[0] || {}
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get device statistics
export const getDeviceStats = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { days = 7 } = req.query;

    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const stats = await Reading.aggregate([
      {
        $match: {
          deviceId,
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          avgTemp: { $avg: '$temperature' },
          maxTemp: { $max: '$temperature' },
          minTemp: { $min: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgPressure: { $avg: '$pressure' },
          avgWind: { $avg: '$wind_speed' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all devices with latest readings
export const getDevicesWithData = async (req: Request, res: Response) => {
  try {
    const devices = await Device.find()
      .populate('userId', 'name email shareData')
      .lean();

    // Get latest reading for each device
    const devicesWithData = await Promise.all(
      devices.map(async (device) => {
        const latestReading = await Reading
          .findOne({ deviceId: device._id })
          .sort({ timestamp: -1 })
          .lean();

        return {
          ...device,
          latestReading
        };
      })
    );

    res.json(devicesWithData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get user alerts/notifications
export const getUserAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = await Alert
      .find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Mark alert as read
export const markAlertRead = async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;

    await Alert.findByIdAndUpdate(alertId, { read: true });

    res.json({ message: 'Alert marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Clear all read alerts
export const clearReadAlerts = async (req: Request, res: Response) => {
  try {
    await Alert.deleteMany({
      userId: req.user._id,
      read: true
    });

    res.json({ message: 'Read alerts cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
