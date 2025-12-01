// Script để tạo device với token cho ESP32
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const deviceSchema = new mongoose.Schema({
  deviceName: String,
  macAddress: String,
  deviceToken: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  status: String,
  lastSeen: Date
});

const Device = mongoose.model('Device', deviceSchema);

async function createDevice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Generate device token
    const deviceToken = crypto.randomBytes(32).toString('hex');

    // Tạo device mới
    const device = new Device({
      deviceName: 'ESP32 Weather Station - Main',
      macAddress: 'AA:BB:CC:DD:EE:FF', // Thay bằng MAC thật từ ESP32
      deviceToken: deviceToken,
      location: {
        lat: 21.0285,
        lng: 105.8542,
        address: 'Hà Nội, Việt Nam'
      },
      status: 'offline',
      lastSeen: new Date()
    });

    await device.save();

    console.log('\n🎉 Device created successfully!');
    console.log('==========================================');
    console.log('Device ID:', device._id);
    console.log('Device Name:', device.deviceName);
    console.log('Device Token:', deviceToken);
    console.log('==========================================');
    console.log('\n📝 Copy this token to ESP32 code:');
    console.log('#define DEVICE_TOKEN "' + deviceToken + '"');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createDevice();
