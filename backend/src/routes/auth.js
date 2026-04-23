import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import generateToken from '../utils/tokenGenerator.js';
import logger from '../utils/logger.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!['job_seeker', 'employer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      role,
      emailVerified: false,
    });

    await user.save();

    const token = generateToken(user._id, user.email);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    logger.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id, user.email);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const user = await pb.collection('users').getFirstListItem(`email = "${email}"`);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.emailVerificationCode !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  await pb.collection('users').update(user.id, {
    emailVerified: true,
    emailVerificationCode: null,
  });

  res.json({ success: true });
});

// GET /auth/verify
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    logger.error('Verify auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await pb.collection('users').getFirstListItem(`email = "${email}"`);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const resetToken = Buffer.from(Math.random().toString()).toString('base64').substring(0, 32);
  const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString();

  await pb.collection('users').update(user.id, {
    passwordResetToken: resetToken,
    passwordResetExpiry: resetTokenExpiry,
  });

  logger.info(`Password reset token generated for ${email}. Token: ${resetToken}`);

  res.json({ message: 'Reset link sent to email' });
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = await pb.collection('users').getFirstListItem(`passwordResetToken = "${token}"`);

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const now = new Date();
  const expiry = new Date(user.passwordResetExpiry);

  if (now > expiry) {
    return res.status(400).json({ error: 'Reset token has expired' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pb.collection('users').update(user.id, {
    password: hashedPassword,
    passwordConfirm: hashedPassword,
    passwordResetToken: null,
    passwordResetExpiry: null,
  });

  res.json({ success: true });
});

export default router;