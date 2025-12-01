import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// Register new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: 'user'
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        deviceId: user.deviceId
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get current user
export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('deviceId');

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update user settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { shareData, name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { shareData, name },
      { new: true }
    ).select('-password');

    res.json({ message: 'Settings updated', user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
