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
      return res.status(400).json({ error: 'skills array is required' });
    }

    // Normalize user skills to lowercase
    const userSkills = skills.map(s => s.trim().toLowerCase());

    // Fetch all jobs from MongoDB
    const jobs = await Job.find().limit(100);

    // Calculate match score for each job
    const jobsWithScores = jobs
      .map(job => {
        let matchScore = 0;
        let matchedSkillsCount = 0;

        if (job.skills && job.skills.length > 0) {
          const requiredSkills = job.skills.map(s => s.toLowerCase());
          // Calculate percentage of required skills user has
          matchedSkillsCount = requiredSkills.filter(skill => userSkills.includes(skill)).length;
          matchScore = (matchedSkillsCount / requiredSkills.length) * 100;
        } else {
          // If no required skills specified, give base score
          matchScore = 50;
        }

        return {
          id: job._id,
          title: job.title,
          location: job.location,
          salary: job.salary,
          jobType: job.jobType,
          remoteType: job.remoteType,
          match_score: Math.round(matchScore),
          required_skills: job.skills || [],
        };
      })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10); // Return top 10 matches

    res.json({
      jobs: jobsWithScores,
    });
  } catch (error) {
    logger.error('Job recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;