import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  deviceId?: mongoose.Types.ObjectId;
  shareData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device'
  },
  shareData: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
