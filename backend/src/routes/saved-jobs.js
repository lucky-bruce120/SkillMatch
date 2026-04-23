import express from 'express';
import SavedJob from '../models/SavedJob.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /saved-jobs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const savedJobs = await SavedJob.find({ user_id: userId })
      .populate('job_id')
      .sort({ created: -1 });

    // Transform to match expected format
    const formattedSavedJobs = savedJobs.map(saved => ({
      id: saved._id,
      job_id: saved.job_id._id,
      user_id: saved.user_id,
      created: saved.created,
      job: saved.job_id // Include populated job data
    }));

    res.json(formattedSavedJobs);
  } catch (error) {
    logger.error('Get saved jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /saved-jobs
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { job_id } = req.body;
    const userId = req.userId;

    // Check if already saved
    const existing = await SavedJob.findOne({
      user_id: userId,
      job_id: job_id
    });

    if (existing) {
      return res.status(400).json({ error: 'Job already saved' });
    }

    const savedJob = new SavedJob({
      user_id: userId,
      job_id: job_id
    });

    await savedJob.save();

    res.status(201).json({
      success: true,
      saved_at: savedJob.created,
    });
  } catch (error) {
    logger.error('Save job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /saved-jobs/:jobId
router.delete('/:jobId', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    const savedJob = await SavedJob.findOneAndDelete({
      user_id: userId,
      job_id: jobId
    });

    if (!savedJob) {
      return res.status(404).json({ error: 'Saved job not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete saved job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /saved-jobs/check?job_id=...
router.get('/check', authMiddleware, async (req, res) => {
  try {
    const { job_id } = req.query;
    const userId = req.userId;

    const savedJob = await SavedJob.findOne({
      user_id: userId,
      job_id: job_id
    });

    if (savedJob) {
      res.json({ saved: true });
    } else {
      res.status(404).json({ saved: false });
    }
  } catch (error) {
    logger.error('Check saved job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;