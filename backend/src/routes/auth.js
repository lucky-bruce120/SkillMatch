import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import generateToken from '../utils/tokenGenerator.js';
import logger from '../utils/logger.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

const generateShortCode = () => String(Math.floor(100000 + Math.random() * 900000));
const generateResetToken = () => crypto.randomBytes(24).toString('hex');

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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const emailVerificationCode = generateShortCode();

    const user = new User({
      email,
      password: hashedPassword,
      role,
      emailVerified: false,
      emailVerificationCode,
    });

    await user.save();

    const token = generateToken(user._id, user.email);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
      },
      token,
      emailVerificationCode,
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    if (user.account_status === 'deactivated') {
      return res.status(403).json({ error: 'Account is deactivated' });
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
        account_status: user.account_status,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
      account_status: user.account_status,
    });
  } catch (error) {
    logger.error('Verify auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = generateResetToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpiry = new Date(Date.now() + 3600000);
    await user.save();

    logger.info(`Password reset token generated for ${email}: ${resetToken}`);

    res.json({
      message: 'Reset link sent to email',
      resetToken,
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password, passwordConfirm, newPassword } = req.body;
  const nextPassword = password || newPassword;

  if (!token || !nextPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (nextPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (passwordConfirm && nextPassword !== passwordConfirm) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const user = await User.findOne({ passwordResetToken: token });
    if (!user || !user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = await bcrypt.hash(nextPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
