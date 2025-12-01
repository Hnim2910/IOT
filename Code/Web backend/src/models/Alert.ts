import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  deviceId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  type: 'hot' | 'cold' | 'rain' | 'wind' | 'info';
  title: string;
  message: string;
  emailSent: boolean;
  read: boolean;
  timestamp: Date;
}

const AlertSchema = new Schema<IAlert>({
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  type: {
    type: String,
    enum: ['hot', 'cold', 'rain', 'wind', 'info'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

AlertSchema.index({ userId: 1, timestamp: -1 });
AlertSchema.index({ deviceId: 1, timestamp: -1 });

export default mongoose.model<IAlert>('Alert', AlertSchema);
