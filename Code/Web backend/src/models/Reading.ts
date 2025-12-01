import mongoose, { Schema, Document } from 'mongoose';

export interface IReading extends Document {
  deviceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  temperature: number;
  humidity: number;
  pressure: number;
  rain_level: number;
  wind_speed: number;
  rain_status: string;
  timestamp: Date;
}

const ReadingSchema = new Schema<IReading>({
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  pressure: {
    type: Number,
    required: true
  },
  rain_level: {
    type: Number,
    required: true
  },
  wind_speed: {
    type: Number,
    required: true
  },
  rain_status: {
    type: String,
    default: 'No Rain'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound indexes for efficient queries
ReadingSchema.index({ deviceId: 1, timestamp: -1 });
ReadingSchema.index({ userId: 1, timestamp: -1 });

// Auto-delete old data after 30 days (optional)
ReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model<IReading>('Reading', ReadingSchema);
