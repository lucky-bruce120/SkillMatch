import 'dotenv/config';
import express from 'express';
import InterviewTip from '../models/InterviewTip.js';
import InterviewQuestion from '../models/InterviewQuestion.js';
import InterviewPrepProgress from '../models/InterviewPrepProgress.js';
import authMiddleware from '../middleware/auth.js';
import { requestJsonWithFallback, toStringArray } from '../utils/ai.js';
import { escapeRegex } from '../utils/sanitize.js';
import logger from '../utils/logger.js';

const router = express.Router();

/* ---------------------------------------------------------- role suggestions */

/**
 * Roles offered in the UI. The database may hold questions/tips for other
 * titles, so this is a floor rather than the full list - `GET /roles` returns
 * the union of this and whatever actually exists in the database.
 */
const BASE_ROLES = [
  'Software Engineer',
  'Data Scientist',
  'Data Analyst',
  'Product Manager',
  'UX Designer',
  'Frontend Engineer',
  'Backend Engineer',
  'DevOps Engineer',
  'Marketing',
  'Project Manager',
];

/* --------------------------------------------------------------- checklist */

/**
 * Pre-interview checklist. These are universal enough to be useful for any role
 * and are ordered so ticking them top-to-bottom is the natural order to work in.
 */
const CHECKLIST = [
  { id: 'research', label: 'Research the company: mission, product, recent news', category: 'Research' },
  { id: 'jd-map', label: 'Re-read the job description and map your CV onto each requirement', category: 'Research' },
  { id: 'stories', label: 'Prepare 4-5 STAR stories: a win, a failure, a conflict, a deadline, a leadership moment', category: 'Preparation' },
  { id: 'pitch', label: 'Write a 90-second "tell me about yourself" pitch', category: 'Preparation' },
  { id: 'salary', label: 'Research the salary band and decide your number and walk-away point', category: 'Preparation' },
  { id: 'questions', label: 'Write 3 questions to ask them - one about the team, one about the work, one about growth', category: 'Preparation' },
  { id: 'gaps', label: 'Decide how you will explain any employment gaps or career changes', category: 'Preparation' },
  { id: 'cv', label: 'Re-read your own CV so nothing on it surprises you', category: 'Logistics' },
  { id: 'portfolio', label: 'Open your portfolio, GitHub or live demo links and check they load', category: 'Logistics' },
  { id: 'tech', label: 'Test camera, microphone, screen sharing and internet on the actual device', category: 'Logistics' },
  { id: 'quiet', label: 'Prepare a quiet space, a clean background and a backup phone hotspot', category: 'Logistics' },
  { id: 'outfit', label: 'Choose an outfit one step above your daily office wear', category: 'Logistics' },
  { id: 'rest', label: 'Get a full night of sleep and avoid a heavy meal beforehand', category: 'Logistics' },
];

/* --------------------------------------------------------------- resources */

/**
 * Practice material with real, stable links. Filtered to what is relevant for
 * the role rather than showing the same four cards to everybody.
 */
const ALL_RESOURCES = [
  {
    id: 'star-guide',
    title: 'The STAR method, explained',
    description: 'Situation, Task, Action, Result - the structure interviewers are listening for.',
    type: 'Guide',
    url: 'https://www.indeed.com/career-advice/interviewing/what-is-the-star-interview-method',
    appliesTo: ['all']
  },
  {
    id: 'system-design',
    title: 'System Design Primer',
    description: 'The canonical free guide to the concepts behind system design rounds.',
    type: 'Guide',
    url: 'https://github.com/donnemartin/system-design-primer',
    appliesTo: ['technical']
  },
  {
    id: 'leetcode',
    title: 'LeetCode practice',
    description: 'Solve real interview problems, then read the top-voted answer for each.',
    type: 'Practice',
    url: 'https://leetcode.com',
    appliesTo: ['technical']
  },
  {
    id: 'salary-negotiation',
    title: 'Salary negotiation guide',
    description: 'Scripts, anchoring tactics and how to handle "what are your expectations?"',
    type: 'Guide',
    url: 'https://www.indeed.com/career-advice/salary/salary-negotiation-guide',
    appliesTo: ['all']
  },
  {
    id: 'levels',
    title: 'Levels.fyi compensation data',
    description: 'Real salary bands by company and location, so you negotiate with data.',
    type: 'Tool',
    url: 'https://www.levels.fyi',
    appliesTo: ['all']
  },
  {
    id: 'behavioural-bank',
    title: 'Behavioural question bank',
    description: 'A long list of behavioural prompts to mine for STAR stories before you start.',
    type: 'Practice',
    url: 'https://www.thebalancecareers.com/behavioral-interview-questions-4153021',
    appliesTo: ['all']
  },
  {
    id: 'interview-cake',
    title: 'Interview Cake',
    description: 'Step-by-step practice problems with worked solutions, not just answers.',
    type: 'Practice',
    url: 'https://www.interviewcake.com',
    appliesTo: ['technical']
  },
  {
    id: 'product-teardown',
    title: 'Product and case interview guide',
    description: 'How to structure a product sense or case study walkthrough.',
    type: 'Guide',
    url: 'https://www.indeed.com/career-advice/interviewing/product-manager-interview-questions',
    appliesTo: ['product']
  },
  {
    id: 'design-portfolio',
    title: 'Portfolio review checklist',
    description: 'What reviewers look for in a design portfolio and how to present case studies.',
    type: 'Guide',
    url: 'https://www.figma.com/blog/design-portfolio-tips/',
    appliesTo: ['design']
  },
  {
    id: 'teamblind',
    title: 'TeamBlind',
    description: 'Read recent interview experiences for the specific company before you go in.',
    type: 'Community',
    url: 'https://www.teamblind.com',
    appliesTo: ['all']
  },
];

/** Bucket a role so we can show relevant resources. */
const classifyRole = (role = '') => {
  const text = String(role).toLowerCase();
  if (/design|ux|ui|creative|art/.test(text)) return 'design';
  if (/product|owner|po\b|program|project|scrum|marketing|growth/.test(text)) return 'product';
  if (/engineer|developer|program|data|devops|sre|security|architect|qa|test|scientist|analyst/.test(text)) return 'technical';
  return 'general';
};

const resourcesForRole = (role) => {
  const bucket = classifyRole(role);
  const relevant = ALL_RESOURCES.filter(
    (resource) => resource.appliesTo.includes('all') || resource.appliesTo.includes(bucket)
  );
  // Cap the list so the tab does not become a wall of links.
  return relevant
    .slice(0, 6)
    .map((resource) => {
      const copy = { ...resource };
      delete copy.appliesTo; // internal filtering only
      return copy;
    });
};

/* ------------------------------------------------------------------ prompts */

const PRACTICE_SYSTEM =
  'You are an interview coach. You produce realistic interview questions with strong, specific model answers. You reply with valid JSON only and never pad answers with generic filler.';

const buildPracticePrompt = (role, questions) => {
  const seedList = questions.length
    ? questions.map((question, index) => `${index + 1}. ${question.question}`).join('\n')
    : '(none supplied — invent the questions yourself)';

  return `Build a practice set for someone interviewing for the role of ${role}.

Existing question bank for this role, if any:
${seedList}

Return JSON shaped exactly like this:
{
  "practice": [
    {
      "question": "the interview question, phrased as the interviewer would say it",
      "category": "technical | behavioural | situational | company",
      "difficulty": "easy | medium | hard",
      "answerStructure": ["beat to hit", for this specific answer, as short strings],
      "sampleAnswer": "a model answer of 80-140 words that sounds like a real person speaking and follows the structure above",
      "watchOutFor": "the most common mistake people make on this question"
    }
  ],
  "proTips": [
    { "title": "short tip title", "detail": "two or three sentences of genuinely useful, specific advice" }
  ],
  "dayBefore": ["checklist item", "for the day before the interview"],
  "duringInterview": ["checklist item", "for during the interview itself"],
  "afterInterview": ["checklist item", "for immediately after the interview"]
}

RULES
- Produce between 6 and 8 practice questions, mixing categories.
- answers must be concrete. Never write "mention your achievements" - say what to say.
- proTips: 4 to 6 entries that are specific to ${role}, not generic interview advice.
- dayBefore/duringInterview/afterInterview: 4 to 6 short items each.
- No markdown fences, JSON only.`;
};

/** Shape whatever the model returned into the contract the UI renders. */
const normalisePractice = (raw) => {
  const practice = (Array.isArray(raw?.practice) ? raw.practice : [])
    .filter((entry) => entry && entry.question)
    .slice(0, 10)
    .map((entry) => ({
      id: entry.id || `practice-${Math.random().toString(36).slice(2, 9)}`,
      question: String(entry.question).trim(),
      category: entry.category || 'behavioural',
      difficulty: ['easy', 'medium', 'hard'].includes(String(entry.difficulty).toLowerCase())
        ? String(entry.difficulty).toLowerCase()
        : 'medium',
      answerStructure: toStringArray(entry.answerStructure || entry.answer_structure, { limit: 6 }),
      sampleAnswer: entry.sampleAnswer || entry.sample_answer || '',
      watchOutFor: entry.watchOutFor || entry.watch_out_for || '',
    }));

  const proTips = (Array.isArray(raw?.proTips) ? raw.proTips : Array.isArray(raw?.pro_tips) ? raw.pro_tips : [])
    .filter((entry) => entry && (entry.title || entry.detail))
    .slice(0, 8)
    .map((entry) => ({
      title: entry.title || 'Tip',
      detail: entry.detail || '',
    }));

  const listOf = (value) => toStringArray(value, { limit: 8 });

  return {
    practice,
    proTips,
    dayBefore: listOf(raw?.dayBefore || raw?.day_before),
    duringInterview: listOf(raw?.duringInterview || raw?.during_interview),
    afterInterview: listOf(raw?.afterInterview || raw?.after_interview),
  };
};

/** Deterministic practice set used when the AI is unavailable. */
const buildFallbackPractice = (role, questions, tips) => {
  const bucket = classifyRole(role);
  const isTechnical = bucket === 'technical';

  const practice = questions.slice(0, 6).map((question) => ({
    id: `practice-${question._id}`,
    question: question.question,
    category: isTechnical ? 'technical' : 'behavioural',
    difficulty: String(question.difficulty || 'medium').toLowerCase(),
    answerStructure: [
      'Situation: one sentence on the context and why it mattered',
      'Task: what you personally were responsible for',
      'Action: the 2-3 specific things you did, including the hardest part',
      'Result: the number, and what changed because of it',
    ],
    sampleAnswer:
      question.sample_answer ||
      'Use the STAR structure. Be concrete about your own contribution rather than the team\'s, and end with a measurable result.',
    watchOutFor: 'Describing the whole project instead of your specific contribution.',
  }));

  return {
    practice,
    proTips: tips.slice(0, 6).map((tip) => ({
      title: tip.category || 'Tip',
      detail: tip.tip_text,
    })),
    dayBefore: CHECKLIST.filter((item) => item.category !== 'Logistics').map((item) => item.label),
    duringInterview: [
      'Answer the question that was asked before adding colour.',
      'Take a breath before answering - a short pause reads as confidence.',
      'If you do not know, say so and describe how you would find out.',
    ],
    afterInterview: [
      'Send a short thank-you note within 24 hours.',
      'Write down what each question was really probing.',
      'Note any gaps you were caught on and close them.',
    ],
  };
};

/* -------------------------------------------------------------------- routes */

/** GET /interview-prep/roles - roles available to practise. */
router.get('/roles', async (req, res) => {
  try {
    const [questionRoles, tipRoles] = await Promise.all([
      InterviewQuestion.distinct('job_role'),
      InterviewTip.distinct('job_role'),
    ]);

    const fromDb = [...questionRoles, ...tipRoles]
      .filter((role) => typeof role === 'string' && role.trim())
      .map((role) => role.trim());

    const roles = [...new Set([...BASE_ROLES, ...fromDb])].sort((a, b) => a.localeCompare(b));

    res.json({ roles });
  } catch (error) {
    logger.error('Interview prep roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /interview-prep/:jobRole/checklist - which checklist items are ticked. */
router.get('/:jobRole/checklist', authMiddleware, async (req, res) => {
  try {
    const progress = await InterviewPrepProgress.findOne({
      user_id: req.userId,
      job_role: req.params.jobRole,
    });

    res.json({ jobRole: req.params.jobRole, completed: progress?.completed || [] });
  } catch (error) {
    logger.error('Interview prep checklist read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /interview-prep/:jobRole/checklist - persist ticked items. */
router.put('/:jobRole/checklist', authMiddleware, async (req, res) => {
  try {
    const { jobRole } = req.params;
    const { completed } = req.body || {};

    if (!Array.isArray(completed)) {
      return res.status(400).json({ error: 'completed must be an array of checklist item ids' });
    }

    // Only ids that exist on the checklist can be stored, so a stale client
    // cannot persist garbage.
    const validIds = new Set(CHECKLIST.map((item) => item.id));
    const sanitised = [...new Set(completed.map(String).filter((id) => validIds.has(id)))];

    const progress = await InterviewPrepProgress.findOneAndUpdate(
      { user_id: req.userId, job_role: jobRole },
      { $set: { completed: sanitised } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ jobRole, completed: progress.completed });
  } catch (error) {
    logger.error('Interview prep checklist save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /interview-prep/:jobRole
 *
 * Questions and tips come from the database; practice sets, pro tips and the
 * staged checklists are generated by AI with a deterministic fallback.
 */
// AI guidance for interview answers
router.post('/guidance', authMiddleware, async (req, res) => {
  try {
    const { role, answer } = req.body;

    if (!answer || answer.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a more detailed answer' });
    }

    const guidancePrompt = `You are an expert interview coach for ${role || 'this role'}. 
Analyze the following interview answer and provide constructive feedback.

Answer: "${answer}"

Provide your response in this JSON format:
{
  "feedback": "Overall assessment in 2-3 sentences",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "suggestedAnswer": "A stronger version of the answer using STAR method (Situation, Task, Action, Result)"
}`;

    const { data } = await requestJsonWithFallback({
      label: 'interview-guidance',
      system: 'You are an expert interview coach. Always respond with valid JSON.',
      user: guidancePrompt,
      temperature: 0.6,
      maxTokens: 1500,
      fallback: () => ({
        feedback: 'Focus on using the STAR method (Situation, Task, Action, Result) to structure your answer with specific examples and measurable outcomes.',
        strengths: [
          'Shows clear communication',
          'Addresses the question directly',
        ],
        improvements: [
          'Add more specific details and examples',
          'Include measurable results or outcomes',
          'Structure using STAR method more explicitly',
        ],
        suggestedAnswer: 'Structure your answer with:\n\nS (Situation): Set the context...\nT (Task): Describe your responsibility...\nA (Action): Explain what you did...\nR (Result): Share the outcome with metrics...',
      }),
    });

    res.json(data);
  } catch (error) {
    logger.error('Error generating interview guidance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:jobRole', async (req, res) => {
  try {
    const { jobRole } = req.params;

    if (!jobRole) {
      return res.status(400).json({ error: 'Job role is required' });
    }

    const jobRoleFilter = { job_role: { $regex: escapeRegex(jobRole), $options: 'i' } };

    const [tips, questions] = await Promise.all([
      InterviewTip.find(jobRoleFilter).limit(40),
      InterviewQuestion.find(jobRoleFilter).limit(40),
    ]);

    const { data, aiGenerated, aiError } = await requestJsonWithFallback({
      label: 'interview-prep',
      system: PRACTICE_SYSTEM,
      user: buildPracticePrompt(jobRole, questions),
      temperature: 0.5,
      maxTokens: 2400,
      fallback: () => buildFallbackPractice(jobRole, questions, tips),
    });

    const generated = normalisePractice(data);
    const fallback = buildFallbackPractice(jobRole, questions, tips);

    res.json({
      jobRole,
      roleType: classifyRole(jobRole),
      aiGenerated,
      aiError,
      tips: tips.map((tip) => ({
        id: tip._id,
        category: tip.category,
        tip_text: tip.tip_text,
      })),
      questions: questions.map((question) => ({
        id: question._id,
        question: question.question,
        sample_answer: question.sample_answer,
        difficulty: question.difficulty,
      })),
      checklist: CHECKLIST,
      resources: resourcesForRole(jobRole),
      // If the model gave us nothing usable, use the local set wholesale.
      practice: generated.practice.length ? generated.practice : fallback.practice,
      proTips: generated.proTips.length ? generated.proTips : fallback.proTips,
      dayBefore: generated.dayBefore.length ? generated.dayBefore : fallback.dayBefore,
      duringInterview: generated.duringInterview.length ? generated.duringInterview : fallback.duringInterview,
      afterInterview: generated.afterInterview.length ? generated.afterInterview : fallback.afterInterview,
    });
  } catch (error) {
    logger.error('Error fetching interview prep data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
