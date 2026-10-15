import express from 'express';
import Job from '../models/Job.js';
import logger from '../utils/logger.js';
import { escapeRegex } from '../utils/sanitize.js';

const router = express.Router();

// GET /jobs/search
router.get('/search', async (req, res) => {
  const { location, salary_min, salary_max, job_type, remote_type, search_term } = req.query;

  try {
    let query = {};

    if (search_term) {
      const safeTerm = escapeRegex(search_term);
      query.$or = [
        { title: { $regex: safeTerm, $options: 'i' } },
        { description: { $regex: safeTerm, $options: 'i' } }
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

export default router;
