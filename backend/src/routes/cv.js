import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import CVAnalysis from '../models/CVAnalysis.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to extract text from PDF
const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    logger.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
};

// POST /cv/analyze
router.post('/analyze', authMiddleware, upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CV file is required' });
  }

  const userId = req.userId;

  // Extract text from PDF
  let cvText = '';
  if (req.file.mimetype === 'application/pdf') {
    cvText = await extractTextFromPDF(req.file.buffer);
  } else if (req.file.mimetype === 'text/plain') {
    cvText = req.file.buffer.toString('utf-8');
  } else {
    return res.status(400).json({ error: 'Only PDF and TXT files are supported' });
  }

  if (!cvText || cvText.trim().length === 0) {
    return res.status(400).json({ error: 'Could not extract text from CV file' });
  }

  // Send to OpenAI for analysis
  const prompt = `Analyze the following CV and provide:
1. Extract all skills mentioned (return as comma-separated list)
2. Identify missing skills for common tech/business roles (return as comma-separated list)
3. Provide 3-5 improvement suggestions (return as numbered list)
4. Calculate a CV score from 0-100 based on completeness, clarity, and professionalism

Format your response as JSON with these exact keys:
{
  "extracted_skills": "skill1, skill2, skill3",
  "missing_skills": "skill1, skill2, skill3",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "cv_score": 75,
  "analysis_text": "Overall analysis summary"
}

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
    throw new Error('Failed to parse CV analysis response');
  }

  // Save analysis to MongoDB
  const cvAnalysis = new CVAnalysis({
    job_seeker_id: userId,
    cv_file: req.file.originalname,
    analysis_result: analysisResult,
    cv_score: analysisResult.cv_score || 0,
    extracted_skills: analysisResult.extracted_skills ? analysisResult.extracted_skills.split(',').map(s => s.trim()) : [],
    missing_skills: analysisResult.missing_skills ? analysisResult.missing_skills.split(',').map(s => s.trim()) : [],
    suggestions: analysisResult.suggestions || [],
  });
  
  await cvAnalysis.save();

  res.status(201).json({
    id: cvAnalysis.id,
    cv_score: analysisResult.cv_score,
    extracted_skills: analysisResult.extracted_skills.split(',').map(s => s.trim()),
    missing_skills: analysisResult.missing_skills.split(',').map(s => s.trim()),
    suggestions: analysisResult.suggestions,
    analysis_text: analysisResult.analysis_text,
  });
});

export default router;