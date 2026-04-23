import express from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [users, jobs, applications] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments(),
    ]);

    res.json({ users, jobs, applications, reports: 0 });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ created: -1 });
    res.json(users);
  } catch (error) {
    logger.error('Admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:userId/status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.account_status = req.body.account_status || user.account_status;
    await user.save();
    res.json(user);
  } catch (error) {
    logger.error('Admin update user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/jobs', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ created: -1 });
    res.json(jobs);
  } catch (error) {
    logger.error('Admin jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/jobs/:jobId/status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.status = req.body.status || job.status;
    await job.save();
    res.json(job);
  } catch (error) {
    logger.error('Admin update job status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
