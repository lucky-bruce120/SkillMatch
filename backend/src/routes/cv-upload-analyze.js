import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to extract text from PDF
const extractTextFromPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  return data.text;
};

// POST /cv-analyze
router.post('/', authMiddleware, upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CV file is required' });
  }

  let cvText = '';

  // Extract text based on file type
  if (req.file.mimetype === 'application/pdf') {
    cvText = await extractTextFromPDF(req.file.buffer);
  } else if (req.file.mimetype === 'text/plain' || req.file.originalname.endsWith('.txt')) {
    cvText = req.file.buffer.toString('utf-8');
  } else if (
    req.file.mimetype === 'application/msword' ||
    req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    req.file.originalname.endsWith('.doc') ||
    req.file.originalname.endsWith('.docx')
  ) {
    // For DOC/DOCX, we'll treat as text (basic support)
    cvText = req.file.buffer.toString('utf-8');
  } else {
    return res.status(400).json({ error: 'Only PDF, TXT, DOC, and DOCX files are supported' });
  }

  if (!cvText || cvText.trim().length === 0) {
    throw new Error('Could not extract text from CV file');
  }

  // Send to OpenAI for analysis
  const prompt = `Analyze the following CV and provide a detailed analysis. Return your response as valid JSON with these exact keys:
{
  "cvScore": 75,
  "extractedSkills": ["skill1", "skill2", "skill3"],
  "skillGaps": ["gap1", "gap2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

Guidelines:
- CV score should be 0-100 based on completeness, clarity, and professionalism
- Extract all technical and soft skills mentioned
- Identify 2-4 skill gaps for common tech/business roles
- Provide 3-5 actionable improvement suggestions
- Return arrays with at least 1 item each

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
    cvScore: analysisResult.cvScore || 0,
    extractedSkills: analysisResult.extractedSkills || [],
    skillGaps: analysisResult.skillGaps || [],
    suggestions: analysisResult.suggestions || [],
  });
});

export default router;