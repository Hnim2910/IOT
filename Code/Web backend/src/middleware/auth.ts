import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Device from '../models/Device';

interface JwtPayload {
  userId: string;
  role: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      device?: any;
    }
  }
}

// Authenticate User (JWT Token)
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Authenticate Admin
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Authenticate Device (ESP32 with deviceToken)
export const authenticateDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No device token provided' });
    }

    const device = await Device.findOne({ deviceToken: token }).populate('userId');

    if (!device) {
      return res.status(401).json({ error: 'Invalid device token' });
    }

    req.device = device;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
