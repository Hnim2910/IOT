import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  userId?: mongoose.Types.ObjectId;
  deviceName: string;
  macAddress: string;
  deviceToken: string;
  pairingCode?: string;
  pairingCodeExpiry?: Date;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'online' | 'offline';
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  deviceName: {
    type: String,
    required: true
  },
  macAddress: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  deviceToken: {
    type: String,
    required: true,
    unique: true
  },
  pairingCode: {
    type: String,
    uppercase: true,
    sparse: true
  },
  pairingCodeExpiry: {
    type: Date
  },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    address: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

DeviceSchema.index({ userId: 1, status: 1 });

export default mongoose.model<IDevice>('Device', DeviceSchema);
