import 'dotenv/config';
import express from 'express';
import Course from '../models/Course.js';
import logger from '../utils/logger.js';
import { escapeRegex } from '../utils/sanitize.js';

const router = express.Router();

// GET /courses/recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const { skill_gaps, difficulty_level } = req.query;

    if (!skill_gaps) {
      return res.status(400).json({ error: 'skill_gaps parameter is required' });
    }

    // Parse skill_gaps - can be comma-separated string or array
    const skillsArray = Array.isArray(skill_gaps)
      ? skill_gaps
      : skill_gaps.split(',').map(s => s.trim().toLowerCase());

    // Build MongoDB query
    let query = {
      $or: skillsArray.map(skill => {
        const safeSkill = escapeRegex(skill);
        return {
          $or: [
            { category: { $regex: safeSkill, $options: 'i' } },
            { title: { $regex: safeSkill, $options: 'i' } }
          ]
        };
      })
    };

    if (difficulty_level) {
      query.difficulty_level = difficulty_level;
    }

    const courses = await Course.find(query).sort({ relevance_score: -1 });

    res.json(courses);
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;