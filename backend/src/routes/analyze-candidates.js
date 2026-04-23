import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import Application from '../models/Application.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /analyze-candidate
router.post('/', authMiddleware, async (req, res) => {
  const { applicationId, cvFileId } = req.body;

  if (!applicationId || !cvFileId) {
    return res.status(400).json({ error: 'applicationId and cvFileId are required' });
  }

  // Retrieve application
  const application = await pb.collection('job_applications').getOne(applicationId);
  if (!application) {
    throw new Error('Application not found');
  }

  // Retrieve CV file from PocketBase
  const jobSeeker = await pb.collection('job_seeker_profiles').getOne(cvFileId);
  if (!jobSeeker || !jobSeeker.cv) {
    throw new Error('CV file not found');
  }

  // Get CV file URL and fetch content
  const cvFileUrl = `${pb.baseUrl}/api/files/${jobSeeker.collectionId}/${jobSeeker.id}/${jobSeeker.cv}`;
  const cvResponse = await fetch(cvFileUrl);

  if (!cvResponse.ok) {
    throw new Error('Failed to fetch CV file');
  }

  let cvText = '';
  const contentType = cvResponse.headers.get('content-type');

  if (contentType && contentType.includes('application/pdf')) {
    // For PDF, we would need pdf-parse, but for now return text extraction error
    throw new Error('PDF parsing requires additional setup');
  } else {
    cvText = await cvResponse.text();
  }

  if (!cvText || cvText.trim().length === 0) {
    throw new Error('Could not extract text from CV file');
  }

  // Send to OpenAI for analysis
  const prompt = `Analyze the following CV and provide a detailed candidate analysis. Return your response as valid JSON with these exact keys:
{
  "skills": [{"name": "skill_name", "proficiency": "beginner|intermediate|advanced|expert"}],
  "cv_score": 75,
  "gaps": ["gap1", "gap2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Guidelines:
- Extract all technical and soft skills with proficiency levels
- CV score should be 0-100 based on completeness, clarity, and professionalism
- Identify skill gaps and areas for improvement
- Provide actionable suggestions for the candidate

CV Content:
${cvText}`;

  const message = await openai.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  let analysisResult;
  try {
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    analysisResult = JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error('Error parsing OpenAI response:', error);
    throw new Error('Failed to parse candidate analysis response');
  }

  res.json({
    success: true,
    analysis: {
      skills: analysisResult.skills || [],
      cv_score: analysisResult.cv_score || 0,
      gaps: analysisResult.gaps || [],
      suggestions: analysisResult.suggestions || [],
    },
    error: null,
  });
});

export default router;