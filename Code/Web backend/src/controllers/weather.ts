import { Request, Response } from 'express';
import Reading from '../models/Reading';
import Device from '../models/Device';
import Alert from '../models/Alert';
import { canSendEmail, sendMail } from '../utils/mailer';

// ESP32 POST weather data
export const receiveData = async (req: Request, res: Response) => {
  try {
    const { temperature, humidity, pressure, rain_level, wind_speed, rain_status } = req.body;
    const device = req.device;

    // Save reading
    const reading = new Reading({
      deviceId: device._id,
      userId: device.userId,
      temperature,
      humidity,
      pressure,
      rain_level,
      wind_speed,
      rain_status: rain_status || 'Unknown'
    });

    await reading.save();

    // Update device status
    await Device.findByIdAndUpdate(device._id, {
      status: 'online',
      lastSeen: new Date()
    });

    // Check for alerts
    await checkAlerts(device, reading);

    // Emit realtime update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`device-${device._id}`).emit('weather-update', reading);
      io.to(`user-${device.userId}`).emit('weather-update', reading);
    }

    res.json({
      success: true,
      message: 'Data received',
      readingId: reading._id
    });
  } catch (error: any) {
    console.error('Error receiving data:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check for weather alerts
async function checkAlerts(device: any, reading: any) {
  const alerts = [];
  const userEmail = device?.userId?.email;
  const fallbackEmail = process.env.ALERT_FALLBACK_EMAIL || process.env.SMTP_USER;

  // High temperature alert (>30°C)
  if (reading.temperature > 30) {
    alerts.push({
      deviceId: device._id,
      userId: device.userId,
      type: 'hot',
      title: 'Nhiệt độ cao!',
      message: `Nhiệt độ ${reading.temperature}°C vượt ngưỡng 30°C`
    });
  }

  // Low temperature alert (<20°C)
  if (reading.temperature < 20) {
    alerts.push({
      deviceId: device._id,
      userId: device.userId,
      type: 'cold',
      title: 'Nhiệt độ thấp!',
      message: `Nhiệt độ ${reading.temperature}°C dưới ngưỡng 20°C`
    });
  }

  // Rain alert (>50%)
  if (reading.rain_level > 50) {
    alerts.push({
      deviceId: device._id,
      userId: device.userId,
      type: 'rain',
      title: 'Đang có mưa!',
      message: `Mức mưa ${reading.rain_level}% vượt ngưỡng 50%`
    });
  }

  // Wind alert (>1 km/h)
  if (reading.wind_speed > 1) {
    alerts.push({
      deviceId: device._id,
      userId: device.userId,
      type: 'wind',
      title: 'Gió mạnh!',
      message: `Tốc độ gió ${reading.wind_speed} km/h vượt ngưỡng 1 km/h`
    });
  }

  // Save alerts
  if (alerts.length > 0) {
    const savedAlerts = await Alert.insertMany(alerts);

    const targetEmail = userEmail || fallbackEmail;

    if (targetEmail && canSendEmail()) {
      for (const alert of savedAlerts) {
        const subject = `[Weather Alert] ${alert.title}`;
        const text = [
          `Device: ${device.deviceName || device._id}`,
          `Time: ${new Date(alert.timestamp || Date.now()).toISOString()}`,
          `Message: ${alert.message}`,
          '',
          'Latest readings:',
          `- Temperature: ${reading.temperature} C`,
          `- Humidity: ${reading.humidity} %`,
          `- Pressure: ${reading.pressure} hPa`,
          `- Rain level: ${reading.rain_level} % (${reading.rain_status})`,
          `- Wind speed: ${reading.wind_speed} km/h`
        ].join('\n');

        const sent = await sendMail({
          to: targetEmail,
          subject,
          text
        });

        if (sent) {
          await Alert.findByIdAndUpdate(alert._id, { emailSent: true });
        }
      }
    } else if (!targetEmail) {
      console.warn('No target email found (user or fallback), skip sending alert email');
    } else if (!canSendEmail()) {
      console.warn('SMTP env vars missing, skip sending alert email');
    }
  }
}

// Get realtime data (latest reading)
export const getRealtimeData = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const reading = await Reading
      .findOne({ deviceId })
      .sort({ timestamp: -1 })
      .lean();

    if (!reading) {
      return res.status(404).json({ error: 'No data found' });
    }

    res.json(reading);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get historical data
export const getHistory = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { hours = 24 } = req.query;

    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const readings = await Reading
      .find({
        deviceId,
        timestamp: { $gte: since }
      })
      .sort({ timestamp: 1 })
      .lean();

    res.json(readings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get statistics
export const getStats = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { hours = 24 } = req.query;

    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const stats = await Reading.aggregate([
      {
        $match: {
          deviceId: deviceId,
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: null,
          avgTemp: { $avg: '$temperature' },
          maxTemp: { $max: '$temperature' },
          minTemp: { $min: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgPressure: { $avg: '$pressure' },
          avgWind: { $avg: '$wind_speed' },
          maxWind: { $max: '$wind_speed' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(stats[0] || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


