import express from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import SavedJob from '../models/SavedJob.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /jobs/search
router.get('/search', async (req, res) => {
  const { location, salary_min, salary_max, job_type, remote_type, search_term } = req.query;

  try {
    let query = {};

    if (search_term) {
      query.$or = [
        { title: { $regex: search_term, $options: 'i' } },
        { description: { $regex: search_term, $options: 'i' } }
      ];
    }

    if (location) {
      query.location = location;
    }

    if (salary_min) {
      query.salary = { ...query.salary, $gte: parseInt(salary_min) };
    }

    if (salary_max) {
      query.salary = { ...query.salary, $lte: parseInt(salary_max) };
    }

    if (job_type) {
      query.jobType = job_type;
    }

    if (remote_type) {
      query.remoteType = remote_type;
    }

    const jobs = await Job.find(query).sort({ created: -1 }).populate('employer_id', 'email');

    res.json(jobs);
  } catch (error) {
    logger.error('Jobs search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('employer_id', 'email');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    logger.error('Job fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /jobs/:jobId/apply
router.post('/:jobId/apply', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { cover_letter } = req.body;
    const jobSeekerId = req.userId;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({ job_id: jobId, job_seeker_id: jobSeekerId });
    if (existingApplication) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    const application = new Application({
      job_id: jobId,
      job_seeker_id: jobSeekerId,
      cover_letter,
    });

    await application.save();

    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (error) {
    logger.error('Apply job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /jobs/:jobId/save
router.post('/:jobId/save', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const existingSave = await SavedJob.findOne({
      job_id: jobId,
      user_id: userId
    });

    if (existingSave) {
      return res.status(400).json({ error: 'Job already saved' });
    }

    const savedJob = new SavedJob({
      job_id: jobId,
      user_id: userId,
    });
    await savedJob.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Save job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /jobs/:jobId/save
router.delete('/:jobId/save', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    const savedJob = await SavedJob.findOneAndDelete({
      job_id: jobId,
      user_id: userId
    });

    if (!savedJob) {
      return res.status(404).json({ error: 'Saved job not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Unsave job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
