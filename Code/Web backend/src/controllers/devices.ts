import { Request, Response } from 'express';
import crypto from 'crypto';
import Device from '../models/Device';
import User from '../models/User';

// Get all devices (Admin only)
export const getAllDevices = async (req: Request, res: Response) => {
  try {
    const devices = await Device.find()
      .populate('userId', 'name email')
      .sort({ lastSeen: -1 });

    res.json(devices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's device
export const getUserDevice = async (req: Request, res: Response) => {
  try {
    const device = await Device.findOne({ userId: req.user._id });

    if (!device) {
      return res.status(404).json({ error: 'No device registered' });
    }

    res.json(device);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Register new device
export const registerDevice = async (req: Request, res: Response) => {
  try {
    const { deviceName, macAddress, location } = req.body;
    const userId = req.user._id;

    // Check if device already exists
    const existingDevice = await Device.findOne({ macAddress });
    if (existingDevice) {
      return res.status(400).json({ error: 'Device already registered' });
    }

    // Generate device token
    const deviceToken = crypto.randomBytes(32).toString('hex');

    // Create device
    const device = new Device({
      userId,
      deviceName,
      macAddress: macAddress.toUpperCase(),
      deviceToken,
      location: location || { lat: 0, lng: 0, address: '' }
    });

    await device.save();

    // Update user's deviceId
    await User.findByIdAndUpdate(userId, { deviceId: device._id });

    res.status(201).json({
      message: 'Device registered successfully',
      device,
      deviceToken  // Return token only once for ESP32 configuration
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update device
export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { deviceName, location } = req.body;

    const device = await Device.findOneAndUpdate(
      { _id: deviceId, userId: req.user._id },
      { deviceName, location },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ message: 'Device updated', device });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete device
export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOneAndDelete({
      _id: deviceId,
      userId: req.user._id
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Remove deviceId from user
    await User.findByIdAndUpdate(req.user._id, { $unset: { deviceId: 1 } });

    res.json({ message: 'Device deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Generate pairing code for ESP32
export const generatePairingCode = async (req: Request, res: Response) => {
  try {
    const { macAddress } = req.body;

    if (!macAddress) {
      return res.status(400).json({ error: 'MAC address required' });
    }

    // Check if device already exists
    let device: any = await Device.findOne({ macAddress: macAddress.toUpperCase() });

    if (!device) {
      // Create unpaired device with pairing code
      const pairingCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      const deviceToken = crypto.randomBytes(32).toString('hex');

      device = new Device({
        deviceName: 'ESP32 Weather Station',
        macAddress: macAddress.toUpperCase(),
        deviceToken,
        pairingCode,
        pairingCodeExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        status: 'offline'
      });

      await device.save();
    } else if (device.userId) {
      return res.status(400).json({ error: 'Device already paired' });
    } else {
      // Update pairing code for existing unpaired device
      device.pairingCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      device.pairingCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await device.save();
    }

    res.json({
      message: 'Pairing code generated',
      pairingCode: device.pairingCode,
      expiresIn: '10 minutes'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Pair device with user account
export const pairDevice = async (req: Request, res: Response) => {
  try {
    const { pairingCode } = req.body;
    const userId = req.user._id;

    if (!pairingCode) {
      return res.status(400).json({ error: 'Pairing code required' });
    }

    // Check if user already has a device
    const existingDevice = await Device.findOne({ userId });
    if (existingDevice) {
      return res.status(400).json({ error: 'User already has a paired device. Unpair first.' });
    }

    // Find device by pairing code
    const device: any = await Device.findOne({
      pairingCode: pairingCode.toUpperCase(),
      pairingCodeExpiry: { $gt: new Date() }
    });

    if (!device) {
      return res.status(404).json({ error: 'Invalid or expired pairing code' });
    }

    if (device.userId) {
      return res.status(400).json({ error: 'Device already paired' });
    }

    // Pair device with user
    device.userId = userId;
    device.deviceName = `ESP32 Weather Station - ${req.user.name}`;
    device.pairingCode = undefined;
    device.pairingCodeExpiry = undefined;
    await device.save();

    // Update user's deviceId
    await User.findByIdAndUpdate(userId, { deviceId: device._id });

    res.json({
      message: 'Device paired successfully',
      device: {
        _id: device._id,
        deviceName: device.deviceName,
        macAddress: device.macAddress,
        status: device.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Unpair device from user account
export const unpairDevice = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;

    const device: any = await Device.findOne({ userId });

    if (!device) {
      return res.status(404).json({ error: 'No device paired' });
    }

    // Unpair device (keep device but remove user association)
    device.userId = undefined;
    device.deviceName = 'ESP32 Weather Station (Unpaired)';
    await device.save();

    // Remove deviceId from user
    await User.findByIdAndUpdate(userId, { $unset: { deviceId: 1 } });

    res.json({ message: 'Device unpaired successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
