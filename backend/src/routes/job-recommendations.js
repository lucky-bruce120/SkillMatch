import 'dotenv/config';
import express from 'express';
import Job from '../models/Job.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /job-recommendations
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { skills } = req.body;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'skills array is required and must not be empty' });
    }

    // Normalize user skills to lowercase
    const userSkills = skills.map(s => s.trim().toLowerCase());

    // Fetch all published jobs from MongoDB
    const jobs = await Job.find({ status: 'active' }).limit(100);

    // Calculate match score for each job
    const jobsWithScores = jobs
      .map(job => {
        let matchScore = 0;

        if (job.required_skills && job.required_skills.length > 0) {
          const requiredSkills = job.required_skills.map(s => String(s).toLowerCase());

          // Calculate percentage of user skills that match job requirements
          const matchedSkillsCount = requiredSkills.filter(skill =>
            userSkills.includes(skill)
          ).length;

          matchScore = (matchedSkillsCount / requiredSkills.length) * 100;
        } else {
          // If no required skills specified, give base score
          matchScore = 50;
        }

        return {
          id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          description: job.description,
          matchScore: Math.round(matchScore),
          jobType: job.jobType,
          remoteType: job.remoteType,
          requiredSkills: job.required_skills,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10); // Return top 10 matches

    // Return array directly
    res.json(jobsWithScores);
  } catch (error) {
    logger.error('Job recommendations v2 error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
