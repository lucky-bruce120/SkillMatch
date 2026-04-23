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

const extractTextFromPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  return data.text;
};

const buildAnalysisPrompt = (cvText) => `Analyze the following CV and return only valid JSON.

Required shape:
{
  "cvScore": 75,
  "extractedSkills": ["skill1", "skill2"],
  "skillGaps": ["gap1", "gap2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "analysisText": "Short summary"
}

Rules:
- cvScore must be an integer from 0 to 100
- extractedSkills must be an array of strings
- skillGaps must be an array of 1 to 5 strings
- suggestions must be an array of 2 to 5 strings
- analysisText must be a short paragraph
- Return JSON only, with no markdown fences

CV Content:
${cvText}`;

const parseJsonFromModelOutput = (content) => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in model output');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    cvScore: Number.isFinite(parsed.cvScore) ? Math.max(0, Math.min(100, Math.round(parsed.cvScore))) : 0,
    extractedSkills: Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills.filter(Boolean) : [],
    skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps.filter(Boolean) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(Boolean) : [],
    analysisText: typeof parsed.analysisText === 'string' ? parsed.analysisText : '',
  };
};

router.post('/', authMiddleware, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CV file is required' });
    }

    let cvText = '';

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
      cvText = req.file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Only PDF, TXT, DOC, and DOCX files are supported' });
    }

    if (!cvText || cvText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from CV file' });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You analyze resumes and return structured JSON only.',
        },
        {
          role: 'user',
          content: buildAnalysisPrompt(cvText),
        },
      ],
    });

    const responseText = completion.choices?.[0]?.message?.content || '';
    const analysisResult = parseJsonFromModelOutput(responseText);

    const analysisRecord = await CVAnalysis.create({
      job_seeker_id: req.userId,
      cv_file: req.file.originalname,
      analysis_result: analysisResult,
      cv_score: analysisResult.cvScore,
      extracted_skills: analysisResult.extractedSkills,
      missing_skills: analysisResult.skillGaps,
      suggestions: analysisResult.suggestions,
    });

    res.status(201).json({
      id: analysisRecord.id,
      created: analysisRecord.created,
      cvScore: analysisResult.cvScore,
      extractedSkills: analysisResult.extractedSkills,
      skillGaps: analysisResult.skillGaps,
      suggestions: analysisResult.suggestions,
      analysisText: analysisResult.analysisText,
    });
  } catch (error) {
    logger.error('CV upload analyze error:', error);
    res.status(500).json({ error: 'Failed to analyze CV' });
  }
});

export default router;
