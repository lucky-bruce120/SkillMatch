import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import CVAnalysis from '../models/CVAnalysis.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import Job from '../models/Job.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { requestJsonWithFallback, clampNumber, toStringArray, resolveSkillCoverage } from '../utils/ai.js';
import { analyseCvLocally } from '../utils/cvAnalysis.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/** Keep the prompt inside the model's comfortable input window. */
const MAX_CV_CHARS = 24000;

/* ----------------------------------------------------------- text extraction */

/**
 * Pull plain text out of an uploaded CV.
 *
 * DOCX is a ZIP container, so decoding it as UTF-8 produced mojibake and the
 * analysis silently came back empty even though the UI advertised DOCX support.
 * `mammoth` reads the actual document XML.
 */
const extractText = async (file) => {
  const { mimetype, buffer, originalname = '' } = file;
  const name = originalname.toLowerCase();

  if (mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (mimetype === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
    return buffer.toString('utf-8');
  }

  // Legacy binary .doc is not a ZIP, so it cannot be parsed without a native
  // dependency. Say so rather than feeding the model binary noise.
  if (mimetype === 'application/msword' || name.endsWith('.doc')) {
    const error = new Error(
      'Legacy .doc files are not supported. Please re-save as PDF, DOCX or TXT.'
    );
    error.statusCode = 415;
    throw error;
  }

  const error = new Error('Only PDF, DOCX and TXT files are supported.');
  error.statusCode = 415;
  throw error;
};

/* -------------------------------------------------------------------- prompt */

const SYSTEM =
  'You are a senior career adviser and resume reviewer. You give specific, evidence-based feedback on resumes. You always reply with valid JSON only, and you never invent experience that is not present in the CV.';

const buildPrompt = (cvText, profileSkills, marketSkills) => `
Review this CV and return a structured assessment.

CANDIDATE PROFILE SKILLS (already on their SkillMatch profile, so do not report these as gaps)
${profileSkills.length ? profileSkills.join(', ') : 'None listed'}

SKILLS CURRENTLY IN DEMAND ON THE PLATFORM
${marketSkills.length ? marketSkills.join(', ') : 'None recorded'}

CV CONTENT
"""
${cvText}
"""

Return JSON shaped exactly like this:
{
  "cvScore": 72,
  "scoreBreakdown": {
    "impact": 70,
    "clarity": 65,
    "completeness": 80,
    "skillsCoverage": 75,
    "atsReadability": 70
  },
  "summary": "3-4 sentences: what is strong, what is weak, what to do first",
  "strengths": ["specific strength", "at least 3"],
  "extractedSkills": ["every real skill evidenced in the CV"],
  "missingSkills": [
    { "skill": "Kubernetes", "why": "one line on why this role wants it", "priority": "high | medium | low" }
  ],
  "sections": {
    "experience": "specific feedback on the work history section",
    "education": "specific feedback on the education section",
    "skills": "specific feedback on how skills are presented"
  },
  "actionItems": ["concrete edit they should make", "at least 4, most valuable first"],
  "atsWarnings": ["things an applicant tracking system would flag", "omit the key if none"]
}

RULES
- cvScore is an integer 0-100 judging how well this CV would perform in screening today.
- scoreBreakdown values are integers 0-100.
- missingSkills must NOT include anything in the candidate profile skills list above.
- Prefer missingSkills that appear in the in-demand list above, and give each a priority.
- Be specific and quote the CV when critiquing. Never say "improve your formatting" on its own.
- If the CV is very short, poor quality, or not actually a CV, still return valid JSON with an honest low score.
- No markdown fences, JSON only.`;

/* --------------------------------------------------------------- normalising */

/** Normalise a model response into the stored/returned shape. */
const normaliseAnalysis = (raw, cvText) => {
  const breakdownRaw = raw?.scoreBreakdown || {};
  const breakdown = {
    impact: clampNumber(breakdownRaw.impact, 0, 100, 0),
    clarity: clampNumber(breakdownRaw.clarity, 0, 100, 0),
    completeness: clampNumber(breakdownRaw.completeness, 0, 100, 0),
    skillsCoverage: clampNumber(breakdownRaw.skillsCoverage ?? breakdownRaw.skills_coverage, 0, 100, 0),
    atsReadability: clampNumber(breakdownRaw.atsReadability ?? breakdownRaw.ats_readability, 0, 100, 0),
  };

  const missingSkills = (Array.isArray(raw?.missingSkills) ? raw.missingSkills : [])
    .filter((entry) => entry && (typeof entry === 'string' || entry.skill))
    .slice(0, 10)
    .map((entry) => {
      if (typeof entry === 'string') {
        return { skill: entry.trim(), why: '', priority: 'medium' };
      }
      const priority = ['high', 'medium', 'low'].includes(String(entry.priority).toLowerCase())
        ? String(entry.priority).toLowerCase()
        : 'medium';
      return {
        skill: String(entry.skill).trim(),
        why: entry.why || '',
        priority,
      };
    })
    .filter((entry) => entry.skill);

  const sectionsRaw = raw?.sections || {};

  return {
    cvScore: clampNumber(raw?.cvScore ?? raw?.cv_score, 0, 100, 0),
    scoreBreakdown: breakdown,
    summary: typeof raw?.summary === 'string' ? raw.summary.trim() : '',
    strengths: toStringArray(raw?.strengths, { limit: 8 }),
    extractedSkills: toStringArray(raw?.extractedSkills ?? raw?.extracted_skills, { limit: 40 }),
    missingSkills,
    actionItems: toStringArray(raw?.actionItems ?? raw?.action_items, { limit: 10 }),
    atsWarnings: toStringArray(raw?.atsWarnings ?? raw?.ats_warnings, { limit: 8 }),
    sections: {
      experience: typeof sectionsRaw.experience === 'string' ? sectionsRaw.experience : '',
      education: typeof sectionsRaw.education === 'string' ? sectionsRaw.education : '',
      skills: typeof sectionsRaw.skills === 'string' ? sectionsRaw.skills : '',
    },
    // Word count is a useful reality check: a 40-word "CV" is worth telling
    // the user about explicitly rather than pretending the score is meaningful.
    wordCount: cvText.trim().split(/\s+/).filter(Boolean).length,
  };
};

/* --------------------------------------------------------------- error mapping */

/**
 * Turn an AI failure into something the user can act on.
 *
 * The OpenAI SDK surfaces quota/billing problems as a 429 with
 * `insufficient_quota`, and a bad key as a 401. Reporting those as a generic
 * "we could not analyse that CV" (which is also what a genuinely unreadable
 * file produces) sent people off to re-upload a perfectly good CV, so the
 * distinctions matter.
 */
const describeAiError = (error) => {
  const status = error?.status ?? error?.response?.status;
  const code = error?.code ?? error?.error?.code;
  const message = error?.message || '';

  if (message.includes('OPENAI_API_KEY') || status === 401 || code === 'invalid_api_key') {
    return {
      status: 503,
      error:
        'CV analysis is unavailable because the AI service key is missing or was rejected. Ask the site admin to check OPENAI_API_KEY in backend/.env.',
    };
  }

  if (status === 429 || code === 'insufficient_quota' || message.includes('no credits remaining')) {
    return {
      status: 503,
      error:
        'CV analysis is unavailable right now because the AI service account has run out of credits. Your CV was not saved - try again once billing is topped up.',
    };
  }

  if (status === 429) {
    return {
      status: 429,
      error: 'The AI service is busy right now. Please wait a moment and try again.',
    };
  }

  return {
    status: 502,
    error: 'We could not analyse that CV. Please try again, or upload a different file.',
  };
};

/* --------------------------------------------------------------------- route */

/**
 * POST /cv-upload-analyze
 *
 * Uploads a CV, extracts its text, analyses it with OpenAI and returns both the
 * feedback and the personalised job matches derived from the skills it found.
 */
router.post('/', authMiddleware, upload.single('cv'), async (req, res) => {
  let cvText = '';

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CV file is required' });
    }

    try {
      cvText = await extractText(req.file);
    } catch (extractError) {
      return res.status(extractError.statusCode || 400).json({
        error: extractError.message || 'Could not read that file.',
      });
    }

    if (!cvText || cvText.trim().length === 0) {
      return res.status(400).json({
        error:
          'No text could be extracted from that file. If it is a scanned or image-only PDF, upload a text-based version.',
      });
    }

    // Truncate rather than fail on a very long CV.
    const truncated = cvText.slice(0, MAX_CV_CHARS);

    // Give the model the candidate's real skills and live market demand so the
    // "missing skills" it reports are actually missing.
    const [profile, activeJobs] = await Promise.all([
      JobSeekerProfile.findOne({ user_id: req.userId }).select('skillDetails skills').lean(),
      Job.find({ status: 'active' }).select('required_skills').limit(200).lean(),
    ]);

    const profileSkills = [
      ...(profile?.skillDetails || []).map((entry) => entry.skill_name),
      ...(profile?.skills || []),
    ].filter(Boolean);

    const demand = new Map();
    activeJobs.forEach((job) => {
      (job.required_skills || []).forEach((skill) => {
        const key = String(skill).trim();
        if (key) demand.set(key, (demand.get(key) || 0) + 1);
      });
    });

    const marketSkills = [...demand.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, openings]) => ({ skill, openings }));

    // The AI review is the richer path, but it must never be the only path: an
    // out-of-credit key, a rate limit or an API outage used to turn every
    // upload into a 502 with nothing to show. The local analyser gives real
    // feedback either way, and the response says which one produced it.
    const { data: raw, aiGenerated, aiError } = await requestJsonWithFallback({
      label: 'cv-analyze',
      system: SYSTEM,
      user: buildPrompt(truncated, profileSkills, marketSkills.map((entry) => entry.skill)),
      temperature: 0.3,
      maxTokens: 2600,
      fallback: () =>
        analyseCvLocally(truncated, {
          profileSkills,
          marketSkills,
          textExtractable: true,
        }),
    });

    const analysis = aiGenerated ? normaliseAnalysis(raw, truncated) : raw;

    // Personalised recommendations from the skills actually found in the CV.
    const cvSkills = [...new Set([...analysis.extractedSkills, ...profileSkills])];
    let recommendations = [];

    if (cvSkills.length) {
      const jobs = await Job.find({ status: 'active' })
        .sort({ created: -1 })
        .limit(200)
        .lean();

      recommendations = jobs
        .map((job) => {
          const requiredSkills = (job.required_skills || []).map(String).filter(Boolean);
          if (!requiredSkills.length) return null;

          const coverage = resolveSkillCoverage(requiredSkills, cvSkills);
          const matched = coverage.filter(({ matchedBy }) => matchedBy !== null);

          return {
            id: String(job._id),
            title: job.title,
            company: job.company,
            location: job.location,
            remoteType: job.remoteType,
            jobType: job.jobType,
            salaryMin: job.salary_min,
            salaryMax: job.salary_max,
            description: job.description,
            matchScore: Math.round((matched.length / requiredSkills.length) * 100),
            matchedSkills: matched.map(({ skill, matchedBy }) => ({ skill, yourSkill: matchedBy })),
            missingSkills: coverage.filter(({ matchedBy }) => !matchedBy).map(({ skill }) => skill),
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);
    }

    const analysisRecord = await CVAnalysis.create({
      job_seeker_id: req.userId,
      cv_file: req.file.originalname,
      analysis_result: analysis,
      cv_score: analysis.cvScore,
      extracted_skills: analysis.extractedSkills,
      // Persist the richer objects; `cv.js` reads these for the results page.
      missing_skills: analysis.missingSkills,
      suggestions: analysis.actionItems,
    });

    res.status(201).json({
      id: analysisRecord.id,
      created: analysisRecord.created,
      cvFile: analysisRecord.cv_file,
      cvScore: analysis.cvScore,
      scoreBreakdown: analysis.scoreBreakdown,
      summary: analysis.summary,
      strengths: analysis.strengths,
      extractedSkills: analysis.extractedSkills,
      skillGaps: analysis.missingSkills,
      missingSkills: analysis.missingSkills,
      suggestions: analysis.actionItems,
      actionItems: analysis.actionItems,
      atsWarnings: analysis.atsWarnings,
      sections: analysis.sections,
      wordCount: analysis.wordCount,
      recommendations,
      // Lets the UI be honest about which analyser produced this result.
      aiGenerated,
      aiError,
    });
  } catch (error) {
    logger.error('CV upload analyze error:', error);

    // Reaching here means something failed outside the AI wrapper - most
    // likely the database write. If we do have the text, still try the local
    // analyser rather than throwing the upload away.
    if (cvText.trim()) {
      try {
        const analysis = analyseCvLocally(cvText, { textExtractable: true });
        const record = await CVAnalysis.create({
          job_seeker_id: req.userId,
          cv_file: req.file.originalname,
          analysis_result: analysis,
          cv_score: analysis.cvScore,
          extracted_skills: analysis.extractedSkills,
          missing_skills: analysis.missingSkills,
          suggestions: analysis.actionItems,
        });

        return res.status(201).json({
          id: record.id,
          created: record.created,
          cvFile: record.cv_file,
          cvScore: analysis.cvScore,
          scoreBreakdown: analysis.scoreBreakdown,
          summary: analysis.summary,
          strengths: analysis.strengths,
          extractedSkills: analysis.extractedSkills,
          skillGaps: analysis.missingSkills,
          missingSkills: analysis.missingSkills,
          suggestions: analysis.actionItems,
          actionItems: analysis.actionItems,
          atsWarnings: analysis.atsWarnings,
          sections: analysis.sections,
          wordCount: analysis.wordCount,
          recommendations: [],
          aiGenerated: false,
          aiError: error?.message || 'AI service unavailable',
        });
      } catch (fallbackError) {
        logger.error('Local CV analysis fallback failed:', fallbackError);
      }
    }

    // "AI unavailable" and "your CV is unreadable" need different fixes, so the
    // AI-specific cases get their own message and status.
    const { status, error: message } = describeAiError(error);
    res.status(status).json({ error: message });
  }
});

export default router;
