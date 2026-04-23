import express from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /employer/jobs - Get jobs posted by current employer
router.get('/jobs', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    const jobs = await Job.find({ employer_id: employerId })
      .sort({ created: -1 })
      .populate('employer_id', 'email');

    res.json(jobs);
  } catch (error) {
    logger.error('Get employer jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /employer/jobs - Create a new job
router.post('/jobs', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;
    const {
      title,
      company,
      location,
      description,
      required_skills,
      salary_min,
      salary_max,
      job_type,
      remote_type,
      experience_level,
      status
    } = req.body;

    // Map frontend values to backend enum values
    const jobTypeMapping = {
      'Full-time': 'full-time',
      'Part-time': 'part-time',
      'Contract': 'contract',
      'Internship': 'internship',
      'full_time': 'full-time',
      'part_time': 'part-time',
      'contract': 'contract',
      'internship': 'internship'
    };

    const remoteTypeMapping = {
      'Remote': 'remote',
      'On-site': 'on-site',
      'Hybrid': 'hybrid',
      'remote': 'remote',
      'on_site': 'on-site',
      'hybrid': 'hybrid'
    };

    const experienceLevelMapping = {
      'Entry-level': 'entry',
      'Mid-level': 'mid',
      'Senior': 'senior',
      'Executive': 'executive',
      'Entry-level': 'entry',
      'Mid-level': 'mid',
      'Senior': 'senior',
      'Executive': 'executive'
    };

    const statusMapping = {
      'published': 'active',
      'draft': 'draft',
      'active': 'active',
      'inactive': 'inactive'
    };

    const job = new Job({
      title,
      description,
      company,
      location,
      salary_min,
      salary_max,
      salary: salary_min || salary_max ? Math.max(salary_min || 0, salary_max || 0) : undefined,
      jobType: jobTypeMapping[job_type] || job_type?.toLowerCase(),
      remoteType: remoteTypeMapping[remote_type] || remote_type?.toLowerCase(),
      required_skills: required_skills ? required_skills.split(',').map(skill => skill.trim()) : [],
      experience_level: experienceLevelMapping[experience_level] || experience_level?.toLowerCase(),
      status: statusMapping[status] || 'active',
      employer_id: employerId,
    });

    await job.save();

    res.status(201).json(job);
  } catch (error) {
    logger.error('Create job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /employer/jobs/:jobId - Delete a job
router.delete('/jobs/:jobId', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const employerId = req.userId;

    const job = await Job.findOneAndDelete({
      _id: jobId,
      employer_id: employerId
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/jobs/:jobId/applications - Get applications for a specific job
router.get('/jobs/:jobId/applications', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const employerId = req.userId;

    // Verify the job belongs to this employer
    const job = await Job.findOne({ _id: jobId, employer_id: employerId });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const applications = await Application.find({ job_id: jobId })
      .sort({ applied_at: -1 })
      .populate('job_seeker_id', 'email')
      .populate('job_id', 'title company');

    res.json(applications);
  } catch (error) {
    logger.error('Get job applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/applications - Get all applications for employer's jobs
router.get('/applications', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Get all jobs by this employer
    const employerJobs = await Job.find({ employer_id: employerId }, '_id');

    if (employerJobs.length === 0) {
      return res.json([]);
    }

    const jobIds = employerJobs.map(job => job._id);

    const applications = await Application.find({ job_id: { $in: jobIds } })
      .sort({ applied_at: -1 })
      .populate('job_seeker_id', 'email')
      .populate('job_id', 'title company location');

    res.json(applications);
  } catch (error) {
    logger.error('Get employer applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /employer/applications/:applicationId/status - Update application status
router.put('/applications/:applicationId/status', authMiddleware, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, feedback } = req.body;
    const employerId = req.userId;

    // Find the application and verify it belongs to employer's job
    const application = await Application.findById(applicationId)
      .populate('job_id', 'employer_id');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.job_id.employer_id.toString() !== employerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    application.status = status;
    if (feedback) {
      application.feedback = feedback;
    }
    await application.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Update application status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Get job count
    const jobCount = await Job.countDocuments({ employer_id: employerId });

    // Get application count
    const employerJobs = await Job.find({ employer_id: employerId }, '_id');
    const jobIds = employerJobs.map(job => job._id);
    const applicationCount = await Application.countDocuments({
      job_id: { $in: jobIds }
    });

    // Get pending interview count (applications with status 'accepted' or similar)
    const interviewCount = await Application.countDocuments({
      job_id: { $in: jobIds },
      status: { $in: ['accepted', 'shortlisted'] }
    });

    res.json({
      jobs: jobCount,
      applications: applicationCount,
      interviews: interviewCount
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/dashboard/recent-applications - Get recent applications
router.get('/dashboard/recent-applications', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Get all jobs by this employer
    const employerJobs = await Job.find({ employer_id: employerId }, '_id');

    if (employerJobs.length === 0) {
      return res.json([]);
    }

    const jobIds = employerJobs.map(job => job._id);

    const applications = await Application.find({ job_id: { $in: jobIds } })
      .sort({ applied_at: -1 })
      .limit(5)
      .populate('job_seeker_id', 'email')
      .populate('job_id', 'title company');

    res.json(applications);
  } catch (error) {
    logger.error('Get recent applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;