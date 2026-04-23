import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import Application from '../models/Application.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const extractCvText = async (profile) => {
  if (!profile?.cv) {
    return '';
  }

  const relativePath = profile.cv.replace(/^\/+/, '');
  const filepath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(filepath)) {
    return '';
  }

  const buffer = fs.readFileSync(filepath);
  const extension = path.extname(filepath).toLowerCase();
  if (extension === '.pdf') {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  return buffer.toString('utf-8');
};

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId is required' });
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const profile = await JobSeekerProfile.findOne({ user_id: application.job_seeker_id });
    if (!profile) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }

    const cvText = await extractCvText(profile);
    if (!cvText.trim()) {
      return res.status(400).json({ error: 'Candidate CV is missing or unreadable' });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Return candidate analysis as JSON only.',
        },
        {
          role: 'user',
          content: `Analyze this CV and return JSON with keys skills, cv_score, gaps, suggestions.
skills must be an array of objects with name and proficiency.
CV:
${cvText}`,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    res.json({
      success: true,
      analysis: {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        cv_score: Number.isFinite(parsed.cv_score) ? parsed.cv_score : 0,
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      },
      error: null,
    });
  } catch (error) {
    logger.error('Analyze candidate error:', error);
    res.status(500).json({ error: 'Failed to analyze candidate' });
  }
});

export default router;
