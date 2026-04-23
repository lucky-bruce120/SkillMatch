import 'dotenv/config';
import express from 'express';
import InterviewTip from '../models/InterviewTip.js';
import InterviewQuestion from '../models/InterviewQuestion.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /interview-prep/:jobRole
router.get('/:jobRole', async (req, res) => {
  try {
    const { jobRole } = req.params;

    if (!jobRole) {
      return res.status(400).json({ error: 'Job role is required' });
    }

    // Fetch interview tips for the job role
    const tips = await InterviewTip.find({
      job_role: { $regex: jobRole, $options: 'i' }
    });

    // Fetch interview questions for the job role
    const questions = await InterviewQuestion.find({
      job_role: { $regex: jobRole, $options: 'i' }
    });

    res.json({
      tips: tips.map(tip => ({
        id: tip._id,
        category: tip.category,
        tip_text: tip.tip_text,
      })),
      questions: questions.map(q => ({
        id: q._id,
        question: q.question,
        sample_answer: q.sample_answer,
        difficulty: q.difficulty,
      })),
    });
  } catch (error) {
    logger.error('Error fetching interview prep data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;