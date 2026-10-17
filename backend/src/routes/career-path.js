import express from 'express';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import CVAnalysis from '../models/CVAnalysis.js';
import authMiddleware from '../middleware/auth.js';
import {
  requestJsonWithFallback,
  toStringArray,
  clampNumber,
  skillsMatch,
  resolveSkillCoverage,
} from '../utils/ai.js';
import logger from '../utils/logger.js';

const router = express.Router();

/* --------------------------------------------------------------- level model */

/** Ordered ladder used for both the AI prompt and the local fallback. */
const LADDER = [
  { label: 'Entry level', keywords: ['intern', 'junior', 'graduate', 'trainee', 'associate'] },
  { label: 'Mid level', keywords: ['engineer', 'developer', 'analyst', 'designer', 'manager', 'specialist'] },
  { label: 'Senior', keywords: ['senior', 'lead', 'principal', 'staff', 'iii'] },
  { label: 'Leadership', keywords: ['head', 'director', 'vp', 'chief', 'cto', 'ceo'] },
];

const SENIORITY_RANK = {
  intern: 0, internship: 0, junior: 0, graduate: 0, associate: 0, trainee: 0,
  engineer: 1, developer: 1, analyst: 1, designer: 1, specialist: 1,
  senior: 2, lead: 2, principal: 2, staff: 2,
  manager: 3, head: 3, director: 3, vp: 3, chief: 4, cto: 4, ceo: 4,
};

const rankOfTitle = (title = '') => {
  const text = String(title).toLowerCase();
  let best = 1;
  Object.entries(SENIORITY_RANK).forEach(([keyword, rank]) => {
    if (new RegExp(`\\b${keyword}\\b`).test(text) && rank > best) best = rank;
  });
  return best;
};

/** Total months of work experience from the profile's experience entries. */
const totalExperienceMonths = (experience = []) =>
  experience.reduce((total, entry) => {
    const start = entry.start_date || entry.startDate;
    if (!start) return total;
    const end = entry.currently_working ? new Date() : entry.end_date || entry.endDate || new Date();
    const months = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24 * 30.44);
    return total + (Number.isFinite(months) && months > 0 ? months : 0);
  }, 0);

/** Infer roughly where someone is on the ladder right now. */
const inferLevel = (profile) => {
  const titles = (profile?.experience || []).map((entry) => entry.job_title || entry.title).filter(Boolean);
  const peak = titles.reduce((highest, title) => Math.max(highest, rankOfTitle(title)), 0);

  const months = totalExperienceMonths(profile?.experience || []);
  const years = months / 12;

  let rank = peak;
  if (years < 1) rank = Math.min(rank, 0);
  else if (years < 3) rank = Math.min(rank, 1);
  else if (years < 7) rank = Math.min(rank, 2);

  return LADDER[Math.min(Math.max(rank, 0), LADDER.length - 1)].label;
};

/* ------------------------------------------------------------------ gathering */

/** Collect everything the model (or the fallback) needs to be personalised. */
const gatherContext = async (userId) => {
  const [profile, latestAnalysis, activeJobs] = await Promise.all([
    JobSeekerProfile.findOne({ user_id: userId }).lean(),
    CVAnalysis.findOne({ job_seeker_id: userId }).sort({ created: -1 }).lean(),
    Job.find({ status: 'active' }).sort({ created: -1 }).limit(60).lean(),
  ]);

  const profileSkills = (profile?.skillDetails || []).map((entry) => entry.skill_name).filter(Boolean);
  const analysisSkills = latestAnalysis?.extracted_skills || [];

  // Union of profile skills and anything the CV surfaced, de-duplicated loosely.
  const allSkills = [...profileSkills];
  analysisSkills.forEach((skill) => {
    if (!allSkills.some((existing) => skillsMatch(existing, skill))) allSkills.push(skill);
  });

  const userSkills = analysisSkills.length ? [...new Set([...analysisSkills, ...profileSkills])] : profileSkills;

  // Which skills the market is actually asking for right now.
  const demand = new Map();
  activeJobs.forEach((job) => {
    (job.required_skills || []).forEach((skill) => {
      const key = String(skill).trim().toLowerCase();
      if (key) demand.set(key, (demand.get(key) || 0) + 1);
    });
  });

  const trendingSkills = [...demand.entries()]
    .map(([skill, openings]) => ({ skill, openings }))
    .sort((a, b) => b.openings - a.openings)
    .slice(0, 10);

  const totalApplications = await Application.countDocuments({ job_seeker_id: userId });

  return {
    profile,
    latestAnalysis,
    activeJobs,
    userSkills,
    trendingSkills,
    totalApplications,
    level: inferLevel(profile),
    hasCv: Boolean(profile?.cv || latestAnalysis?.cv_file),
  };
};

/* --------------------------------------------------------------- AI prompts */

const SYSTEM =
  'You are a career adviser inside a job platform. You give specific, honest, actionable career guidance grounded only in the candidate data you are given. You always reply with valid JSON and never invent employers or job titles outside the supplied market data.';

const buildUserPrompt = (ctx) => {
  const profile = ctx.profile || {};
  const experience = (profile.experience || []).map((entry) => {
    const title = entry.job_title || entry.title || 'Unknown role';
    const company = entry.company || 'Unknown company';
    return `- ${title} at ${company}`;
  });

  const education = (profile.education || []).map((entry) => {
    const degree = entry.degree || entry.field_of_study || entry.field || 'Qualification';
    const school = entry.school || entry.institution || 'Unknown school';
    return `- ${degree} from ${school}`;
  });

  return `Produce a personalised career progression plan for this candidate.

CANDIDATE DATA
- Current level (inferred): ${ctx.level}
- Years of experience: ${(totalExperienceMonths(profile.experience || []) / 12).toFixed(1)}
- Location: ${profile.location || 'Not specified'}
- Bio: ${profile.bio || 'Not provided'}
- Profile skills: ${ctx.userSkills.length ? ctx.userSkills.join(', ') : 'None listed'}
- Latest CV score: ${ctx.latestAnalysis?.cv_score ?? 'no CV analysed'}
- Missing skills from last CV analysis: ${(ctx.latestAnalysis?.missing_skills || []).join(', ') || 'None'}
- Roles held: ${experience.length ? experience.join('; ') : 'None listed'}
- Education: ${education.length ? education.join('; ') : 'None listed'}
- Applications submitted: ${ctx.totalApplications}

CURRENT MARKET DEMAND (skill -> number of open roles asking for it)
${ctx.trendingSkills.map((entry) => `- ${entry.skill}: ${entry.openings}`).join('\n') || '- No market data available'}

OPEN ROLES (id | title | company | required skills)
${ctx.activeJobs
  .slice(0, 25)
  .map((job) => `- ${job._id} | ${job.title} | ${job.company || 'Unknown'} | ${(job.required_skills || []).join(', ') || 'not specified'}`)
  .join('\n') || '- No open roles available'}

OUTPUT JSON SHAPE (respect it exactly)
{
  "headline": "one sentence summarising where they are heading",
  "currentRole": "the role they appear to be in now",
  "summary": "2-3 sentence assessment",
  "paths": [
    {
      "targetRole": "role title",
      "timeline": "e.g. 6-12 months",
      "why": "why this is a realistic next step for them specifically",
      "salaryRange": "e.g. 70k-90k",
      "requiredSkills": ["skill"],
      "actionSteps": ["concrete step they can take this month"],
      "jobIds": ["ids of the OPEN ROLES above that match this path"],
      "confidence": "low | medium | high"
    }
  ],
  "focusSkills": ["the 3-5 skills most worth learning next"]
}

RULES
- Give between 3 and 5 paths, ordered from most to least immediately achievable.
- Only reference job ids that appear in the OPEN ROLES list. Use an empty array if none fit.
- requiredSkills must be real, widely used skill names.
- Be honest: if the candidate has thin evidence, lower the confidence rather than inventing experience.
- No markdown, JSON only.`;
};

/* ---------------------------------------------------------------- validation */

const normalisePaths = (raw, ctx) => {
  const list = Array.isArray(raw?.paths) ? raw.paths : [];
  const validJobIds = new Set(ctx.activeJobs.map((job) => String(job._id)));

  return list
    .slice(0, 5)
    .filter((entry) => entry && (entry.targetRole || entry.target_role))
    .map((entry, index) => {
      const requiredSkills = toStringArray(entry.requiredSkills || entry.required_skills, { limit: 12 });
      const coverage = resolveSkillCoverage(requiredSkills, ctx.userSkills);

      return {
        id: `path-${index + 1}`,
        step: index + 1,
        targetRole: String(entry.targetRole || entry.target_role).trim(),
        timeline: entry.timeline || '6-12 months',
        why: entry.why || '',
        salaryRange: entry.salaryRange || entry.salary_range || '',
        actionSteps: toStringArray(entry.actionSteps || entry.action_steps, { limit: 6 }),
        requiredSkills: coverage.map(({ skill, matchedBy }) => ({ skill, have: Boolean(matchedBy) })),
        gapSkills: coverage.filter(({ matchedBy }) => !matchedBy).map(({ skill }) => skill),
        jobIds: (Array.isArray(entry.jobIds || entry.job_ids) ? entry.jobIds || entry.job_ids : [])
          .map(String)
          .filter((id) => validJobIds.has(id))
          .slice(0, 6),
        confidence: ['low', 'medium', 'high'].includes(String(entry.confidence).toLowerCase())
          ? String(entry.confidence).toLowerCase()
          : 'medium',
      };
    });
};

/* ------------------------------------------------------------------ fallback */

/**
 * Deterministic ladder used when the AI is unavailable.
 *
 * Built from the inferred level and the skills employers are currently asking
 * for, so it is genuinely personalised rather than a static demo.
 *
 * Deliberately returns the same *raw* shape the model is asked for (plain skill
 * strings, no coverage flags). `normalisePaths` then applies coverage and
 * confidence handling identically to both sources, so the two cannot drift.
 */
const buildFallback = (ctx) => {
  const ladderByLevel = {
    'Entry level': [
      { targetRole: 'Mid-level Engineer', timeline: '6-12 months', gapBonus: ['Testing', 'Git', 'Code Review', 'CI/CD'] },
      { targetRole: 'Mid-level Analyst', timeline: '6-12 months', gapBonus: ['SQL', 'Data Visualisation', 'Statistics'] },
    ],
    'Mid level': [
      { targetRole: 'Senior Engineer', timeline: '12-24 months', gapBonus: ['System Design', 'Code Review', 'Mentoring', 'Testing'] },
      { targetRole: 'Engineering Lead', timeline: '18-36 months', gapBonus: ['Architecture', 'Delivery Planning', 'Stakeholder Management'] },
    ],
    Senior: [
      { targetRole: 'Staff / Principal Engineer', timeline: '12-24 months', gapBonus: ['System Design', 'Technical Strategy', 'Mentoring'] },
      { targetRole: 'Engineering Manager', timeline: '18-36 months', gapBonus: ['Leadership', 'Hiring', 'Stakeholder Management'] },
    ],
    Leadership: [
      { targetRole: 'Director of Engineering', timeline: '12-24 months', gapBonus: ['Org Design', 'Budgeting', 'Strategy'] },
      { targetRole: 'Head of Engineering', timeline: '24-36 months', gapBonus: ['Strategy', 'Executive Communication'] },
    ],
  };

  // Skills the market wants that this candidate does not have yet.
  const demanded = ctx.trendingSkills
    .filter((entry) => !ctx.userSkills.some((skill) => skillsMatch(skill, entry.skill)))
    .map((entry) => entry.skill);

  const steps = (ladderByLevel[ctx.level] || ladderByLevel['Mid level']).map((step) => {
    const requiredSkills = [...new Set([...demanded.slice(0, 3), ...step.gapBonus])].slice(0, 6);

    // Attach the open roles that best match this target.
    const jobIds = ctx.activeJobs
      .filter((job) =>
        (job.required_skills || []).some((skill) =>
          requiredSkills.some((required) => skillsMatch(required, skill))
        )
      )
      .slice(0, 4)
      .map((job) => String(job._id));

    return {
      targetRole: step.targetRole,
      timeline: step.timeline,
      why:
        `You currently look ${ctx.level.toLowerCase()}. This is the most common next rung for candidates ` +
        `at that stage, and the market is actively hiring for it.`,
      salaryRange: '',
      requiredSkills,
      actionSteps: [
        'Add the highlighted skills below to your profile so you start appearing in these matches.',
        'Open one of the matching roles listed above and study its requirements.',
        'Update your CV with concrete evidence for each skill you already have.',
      ],
      jobIds,
      confidence: jobIds.length ? 'medium' : 'low',
    };
  });

  return {
    headline: `You look ${ctx.level.toLowerCase()}. Here is the ladder above you.`,
    currentRole: (ctx.profile?.experience || [])[0]?.job_title || `${ctx.level} candidate`,
    summary:
      'Built from your profile, your CV analysis and the skills employers are hiring for right now. ' +
      'Add the highlighted skills to move up.',
    paths: steps,
    focusSkills: demanded.length ? demanded.slice(0, 5) : ['System Design', 'Communication', 'Testing'],
  };
};

/* -------------------------------------------------------------------- route */

/**
 * GET /career-path
 *
 * Personalised progression plan for the signed-in job seeker. Uses OpenAI when
 * a key is configured and falls back to a deterministic ladder built from the
 * candidate's own profile and the live job market when it is not.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ctx = await gatherContext(req.userId);

    // A career path with nothing to base it on would be invented advice, so say
    // what is missing instead of generating fiction.
    if (!ctx.userSkills.length) {
      return res.status(200).json({
        aiGenerated: false,
        aiError: null,
        needsProfile: true,
        message: 'Add your skills to your profile so we can build a career path for you.',
        headline: 'Tell us what you can do first',
        currentRole: '',
        summary:
          'A career path is built from your skills, your experience and the roles employers are hiring for. ' +
          'Add a few skills to your profile and this page will fill in.',
        paths: [],
        focusSkills: ctx.trendingSkills.slice(0, 5).map((entry) => entry.skill),
      });
    }

    const { data, aiGenerated, aiError } = await requestJsonWithFallback({
      label: 'career-path',
      system: SYSTEM,
      user: buildUserPrompt(ctx),
      temperature: 0.4,
      maxTokens: 2000,
      fallback: () => buildFallback(ctx),
    });

    const paths = normalisePaths(data, ctx);
    const fallback = buildFallback(ctx);

    res.json({
      aiGenerated,
      aiError,
      needsProfile: false,
      headline: data.headline || fallback.headline,
      currentRole: data.currentRole || fallback.currentRole,
      summary: data.summary || fallback.summary,
      // If the model returned nothing usable, fall back wholesale.
      paths: paths.length ? paths : fallback.paths,
      focusSkills: toStringArray(data.focusSkills || data.focus_skills, { limit: 6 }),
      level: ctx.level,
      yearsExperience: Number((totalExperienceMonths(ctx.profile?.experience || []) / 12).toFixed(1)),
      hasCv: ctx.hasCv,
      profileStrength: clampNumber(
        ctx.profile ? Math.round(((ctx.profile.skillDetails?.length || 0) + (ctx.profile.experience?.length || 0) + (ctx.profile.education?.length || 0) + (ctx.profile.cv ? 1 : 0)) / 4 / 5) * 100 : 0,
        0,
        100,
        0
      ),
    });
  } catch (error) {
    logger.error('Career path error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
