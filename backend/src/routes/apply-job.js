import 'dotenv/config';
import express from 'express';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /apply-job
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { jobId, coverLetter, cvFileId } = req.body;
    const jobSeekerId = req.userId;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    // Verify job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify job seeker exists
    const jobSeeker = await JobSeekerProfile.findOne({ user_id: jobSeekerId });
    if (!jobSeeker) {
      return res.status(404).json({ error: 'Job seeker profile not found' });
    }

    // Check if already applied
    const existingApp = await Application.findOne({ job_id: jobId, job_seeker_id: jobSeekerId });
    if (existingApp) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    // Create job application record
    const application = new Application({
      job_id: jobId,
      job_seeker_id: jobSeekerId,
      cover_letter: coverLetter || '',
    });
    await application.save();

    // Get employer info from job
    const employer = await EmployerProfile.findOne({ user_id: job.employer_id });

    // Create notification for employer
    if (employer) {
      const notification = new Notification({
        user_id: job.employer_id,
        type: 'application_response',
        title: 'New Job Application',
        message: `${jobSeeker.firstName || 'A candidate'} applied for ${job.title}`,
        related_id: application._id,
        isRead: false,
      });
      await notification.save();
    }

    res.status(201).json({
      success: true,
      applicationId: application._id,
      error: null,
    });
  } catch (error) {
    logger.error('Apply job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /apply-job/check?job_id=...
router.get('/check', authMiddleware, async (req, res) => {
  try {
    const { job_id } = req.query;
    const jobSeekerId = req.userId;

    const application = await Application.findOne({
      job_id: job_id,
      job_seeker_id: jobSeekerId
    });

    if (application) {
      res.json({ applied: true });
    } else {
      res.status(404).json({ applied: false });
    }
  } catch (error) {
    logger.error('Check application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /apply-job (get user's applications)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const jobSeekerId = req.userId;

    const applications = await Application.find({ job_seeker_id: jobSeekerId })
      .sort({ applied_at: -1 })
      .populate('job_id', 'title company location salary jobType remoteType employer_id')
      .populate('job_id.employer_id', 'email');

    res.json(applications);
  } catch (error) {
    logger.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;