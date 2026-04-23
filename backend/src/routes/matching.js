import express from 'express';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import Job from '../models/Job.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /matching/calculate
router.get('/calculate', async (req, res) => {
  try {
    const { job_seeker_id, job_id } = req.query;

    if (!job_seeker_id || !job_id) {
      return res.status(400).json({ error: 'Job seeker ID and job ID are required' });
    }

    const jobSeeker = await JobSeekerProfile.findById(job_seeker_id);

    if (!jobSeeker) {
      return res.status(404).json({ error: 'Job seeker profile not found' });
    }

    const job = await Job.findById(job_id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Parse skills
    const jobSeekerSkills = jobSeeker.skills ? jobSeeker.skills.map(s => s.toLowerCase()) : [];
    const jobRequiredSkills = job.skills ? job.skills.map(s => s.toLowerCase()) : [];

    // Calculate skill match (40%)
    let skillMatch = 0;
    if (jobRequiredSkills.length > 0) {
      const matchedSkills = jobRequiredSkills.filter(skill => jobSeekerSkills.includes(skill));
      skillMatch = (matchedSkills.length / jobRequiredSkills.length) * 100;
    }

    // Calculate location match (20%)
    let locationMatch = 0;
    if (job.remoteType === 'remote') {
      locationMatch = 100;
    } else if (jobSeeker.address && job.location && jobSeeker.address.toLowerCase() === job.location.toLowerCase()) {
      locationMatch = 100;
    } else {
      locationMatch = 0;
    }

    // Calculate job type preference match (10%)
    let jobTypeMatch = 0;
    if (jobSeeker.jobType && job.jobType && jobSeeker.jobType.toLowerCase() === job.jobType.toLowerCase()) {
      jobTypeMatch = 100;
    } else {
      jobTypeMatch = 50;
    }

    // Calculate salary match (30%)
    let salaryMatch = 0;
    if (jobSeeker.salary && job.salary) {
      if (jobSeeker.salary <= job.salary) {
        salaryMatch = 100;
      } else {
        salaryMatch = Math.max(0, 100 - ((jobSeeker.salary - job.salary) / jobSeeker.salary) * 100);
      }
    } else {
      salaryMatch = 50;
    }

    // Calculate overall match score
    const matchScore = (skillMatch * 0.4 + locationMatch * 0.2 + jobTypeMatch * 0.1 + salaryMatch * 0.3);

    res.json({
      matchScore: Math.round(matchScore),
      breakdown: {
        skillMatch: Math.round(skillMatch),
        locationMatch: Math.round(locationMatch),
        jobTypeMatch: Math.round(jobTypeMatch),
        salaryMatch: Math.round(salaryMatch),
      },
    });
  } catch (error) {
    logger.error('Matching calculate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;