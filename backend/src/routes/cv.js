import 'dotenv/config';
import express from 'express';
import CVAnalysis from '../models/CVAnalysis.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Normalise a stored analysis for the client.
 *
 * Analyses saved before the richer prompt existed only have the old flat shape,
 * so every field degrades gracefully rather than rendering "undefined".
 */
const formatAnalysis = (analysis) => {
  const result = analysis.analysis_result || {};

  // `missing_skills` is now an array of objects, but older records hold strings.
  const missingSkills = (analysis.missing_skills || result.missingSkills || result.skillGaps || []).map((entry) =>
    typeof entry === 'string'
      ? { skill: entry, why: '', priority: 'medium' }
      : { skill: entry.skill || '', why: entry.why || '', priority: entry.priority || 'medium' }
  );

  const actionItems = analysis.suggestions || result.actionItems || result.suggestions || [];

  return {
    id: analysis.id,
    created: analysis.created,
    cv_file: analysis.cv_file,
    cv_score: analysis.cv_score || 0,
    extracted_skills: analysis.extracted_skills || result.extractedSkills || [],
    missing_skills: missingSkills,
    suggestions: actionItems,
    action_items: actionItems,
    summary: result.summary || result.analysisText || '',
    analysis_text: result.summary || result.analysisText || '',
    strengths: result.strengths || [],
    score_breakdown: result.scoreBreakdown || null,
    sections: result.sections || null,
    ats_warnings: result.atsWarnings || [],
    word_count: result.wordCount ?? null,
  };
};

// GET /cv - the signed-in user's analysis history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10) || 10, 50);

    const analyses = await CVAnalysis.find({ job_seeker_id: req.userId })
      .sort({ created: -1 })
      .limit(limit);

    res.json(analyses.map(formatAnalysis));
  } catch (error) {
    logger.error('Get CV analyses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /cv/:id - a single analysis, ownership checked
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
    logger.error('Get CV analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /cv/:id - let people remove an analysis they uploaded by mistake
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const analysis = await CVAnalysis.findOneAndDelete({
      _id: req.params.id,
      job_seeker_id: req.userId,
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete CV analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
