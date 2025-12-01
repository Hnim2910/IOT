import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User';
import Device from '../models/Device';
import Reading from '../models/Reading';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Create admin account
    const existingAdmin = await User.findOne({ email: 'admin@bigga.com' });
    let admin;

    if (existingAdmin) {
      console.log('⚠️  Admin already exists');
      admin = existingAdmin;
    } else {
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      admin = new User({
        email: 'admin@bigga.com',
        password: hashedAdminPassword,
        name: 'Admin',
        role: 'admin',
        shareData: true
      });
      await admin.save();
      console.log('✅ Admin account created!');
    }

    // Create demo user
    const existingUser = await User.findOne({ email: 'user@bigga.com' });
    let demoUser;

    if (existingUser) {
      console.log('⚠️  Demo user already exists');
      demoUser = existingUser;
    } else {
      const hashedUserPassword = await bcrypt.hash('user123', 10);
      demoUser = new User({
        email: 'user@bigga.com',
        password: hashedUserPassword,
        name: 'Nguyễn Văn A',
        role: 'user',
        shareData: true
      });
      await demoUser.save();
      console.log('✅ Demo user account created!');
    }

    // Create demo device for user
    const existingDevice = await Device.findOne({ userId: demoUser._id });
    let demoDevice;

    if (existingDevice) {
      console.log('⚠️  Demo device already exists');
      demoDevice = existingDevice;
    } else {
      const deviceToken = crypto.randomBytes(32).toString('hex');
      demoDevice = new Device({
        userId: demoUser._id,
        deviceName: 'ESP32 Weather Station - Demo',
        macAddress: 'AA:BB:CC:DD:EE:01',
        deviceToken,
        location: {
          latitude: 10.7769,
          longitude: 106.7009,
          address: 'Ho Chi Minh City, Vietnam'
        },
        status: 'online',
        lastSeen: new Date()
      });
      await demoDevice.save();

      // Update user with deviceId
      demoUser.deviceId = demoDevice._id;
      await demoUser.save();

      console.log('✅ Demo device created!');
      console.log('🔑 Device Token:', deviceToken);
    }

    // Create sample readings
    const existingReadings = await Reading.findOne({ deviceId: demoDevice._id });

    if (!existingReadings) {
      const now = new Date();
      const readings = [];

      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 2000); // Every 2 seconds
        readings.push({
          deviceId: demoDevice._id,
          userId: demoUser._id,
          temperature: 25 + Math.random() * 5,
          humidity: 60 + Math.random() * 20,
          pressure: 1010 + Math.random() * 10,
          rain_level: Math.floor(Math.random() * 100),
          wind_speed: Math.random() * 5,
          rain_status: Math.random() > 0.7,
          timestamp
        });
      }

      await Reading.insertMany(readings);
      console.log('✅ Sample readings created!');
    } else {
      console.log('⚠️  Sample readings already exist');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Database seeded successfully!');
    console.log('═══════════════════════════════════════');
    console.log('\n👤 ADMIN ACCOUNT:');
    console.log('📧 Email: admin@bigga.com');
    console.log('🔑 Password: admin123');
    console.log('\n👤 DEMO USER ACCOUNT:');
    console.log('📧 Email: user@bigga.com');
    console.log('🔑 Password: user123');
    console.log('\n📱 DEMO DEVICE:');
    console.log('🏷️  Name: ESP32 Weather Station - Demo');
    console.log('🔑 Token:', demoDevice.deviceToken);
    console.log('\n⚠️  Please change passwords after first login!');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
