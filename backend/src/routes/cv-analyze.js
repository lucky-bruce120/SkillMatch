import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /cv-analyze
router.post('/', authMiddleware, async (req, res) => {
  const { cvFile, fileName } = req.body;

  if (!cvFile || !fileName) {
    return res.status(400).json({ error: 'cvFile and fileName are required' });
  }

  // Decode base64 if needed
  let cvText = '';
  try {
    if (typeof cvFile === 'string' && cvFile.includes('base64')) {
      const base64Data = cvFile.split(',')[1] || cvFile;
      cvText = Buffer.from(base64Data, 'base64').toString('utf-8');
    } else if (typeof cvFile === 'string') {
      cvText = cvFile;
    } else if (Buffer.isBuffer(cvFile)) {
      cvText = cvFile.toString('utf-8');
    } else {
      throw new Error('Invalid cvFile format');
    }
  } catch (error) {
    logger.error('Error decoding CV file:', error);
    throw new Error('Failed to decode CV file');
  }

  if (!cvText || cvText.trim().length === 0) {
    return res.status(400).json({ error: 'Could not extract text from CV file' });
  }

  // Send to OpenAI for analysis
  const prompt = `Analyze the following CV and provide a detailed analysis. Return your response as valid JSON with these exact keys:
{
  "skills": [{"name": "skill_name", "proficiency": "beginner|intermediate|advanced|expert"}],
  "cv_score": 75,
  "missing_skills": ["skill1", "skill2"],
  "improvement_suggestions": ["suggestion1", "suggestion2"],
  "formatting_suggestions": ["formatting1", "formatting2"]
}

Guidelines:
- Extract all technical and soft skills with proficiency levels
- CV score should be 0-100 based on completeness, clarity, and professionalism
- Identify 3-5 missing skills for common tech/business roles
- Provide 3-5 actionable improvement suggestions
- Provide 2-3 formatting/presentation suggestions
- Ensure all arrays contain at least 1 item

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

  res.json({
    success: true,
    data: {
      skills: analysisResult.skills || [],
      cv_score: analysisResult.cv_score || 0,
      missing_skills: analysisResult.missing_skills || [],
      suggestions: analysisResult.improvement_suggestions || [],
      formatting_suggestions: analysisResult.formatting_suggestions || [],
    },
    error: null,
  });
});

export default router;