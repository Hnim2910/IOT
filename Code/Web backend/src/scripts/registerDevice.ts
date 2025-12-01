import dotenv from 'dotenv';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User';
import Device from '../models/Device';

dotenv.config();

const registerDeviceForUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Get user email from command line argument
    const userEmail = process.argv[2];

    if (!userEmail) {
      console.log('\n❌ Please provide user email!');
      console.log('Usage: npm run register-device <user-email>');
      console.log('Example: npm run register-device user@example.com\n');
      process.exit(1);
    }

    // Find user
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.log(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    if (user.role !== 'user') {
      console.log(`❌ Cannot register device for admin account`);
      process.exit(1);
    }

    // Check if user already has device
    const existingDevice = await Device.findOne({ userId: user._id });

    if (existingDevice) {
      console.log(`⚠️  User already has a device: ${existingDevice.deviceName}`);
      console.log(`🔑 Device Token: ${existingDevice.deviceToken}`);
      process.exit(0);
    }

    // Generate device token
    const deviceToken = crypto.randomBytes(32).toString('hex');

    // Create device
    const device = new Device({
      userId: user._id,
      deviceName: `ESP32 Weather Station - ${user.name}`,
      macAddress: `AA:BB:CC:DD:EE:${Math.random().toString(16).substr(2, 2).toUpperCase()}`,
      deviceToken,
      location: {
        latitude: 10.7769,
        longitude: 106.7009,
        address: 'Ho Chi Minh City, Vietnam'
      },
      status: 'offline',
      lastSeen: new Date()
    });

    await device.save();

    // Update user with deviceId
    user.deviceId = device._id;
    await user.save();

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Device registered successfully!');
    console.log('═══════════════════════════════════════');
    console.log(`\n👤 User: ${user.name} (${user.email})`);
    console.log(`📱 Device Name: ${device.deviceName}`);
    console.log(`🏷️  MAC Address: ${device.macAddress}`);
    console.log(`🔑 Device Token:\n${deviceToken}`);
    console.log('\n📋 Copy token này để cấu hình ESP32:');
    console.log(`const char* deviceToken = "${deviceToken}";`);
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error registering device:', error);
    process.exit(1);
  }
};

registerDeviceForUser();
