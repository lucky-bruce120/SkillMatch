import express from 'express';
import CVAnalysis from '../models/CVAnalysis.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const formatAnalysis = (analysis) => ({
  id: analysis.id,
  created: analysis.created,
  cv_file: analysis.cv_file,
  cv_score: analysis.cv_score || 0,
  extracted_skills: analysis.extracted_skills || [],
  missing_skills: analysis.missing_skills || [],
  suggestions: analysis.suggestions || [],
  analysis_text: analysis.analysis_result?.analysisText || analysis.analysis_result?.analysis_text || '',
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const analyses = await CVAnalysis.find({ job_seeker_id: req.userId })
      .sort({ created: -1 })
      .limit(limit);

    res.json(analyses.map(formatAnalysis));
  } catch (error) {
    logger.error('CV history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const analysis = await CVAnalysis.findOne({
      _id: req.params.id,
      job_seeker_id: req.userId,
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(formatAnalysis(analysis));
  } catch (error) {
    logger.error('CV analysis fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
