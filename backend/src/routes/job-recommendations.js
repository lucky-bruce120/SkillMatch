import 'dotenv/config';
import express from 'express';
import Job from '../models/Job.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import authMiddleware from '../middleware/auth.js';
import { skillsMatch, resolveSkillCoverage } from '../utils/ai.js';
import logger from '../utils/logger.js';

const router = express.Router();

/** How much a skill's proficiency level counts towards a match. */
const PROFICIENCY_WEIGHT = {
  beginner: 0.6,
  intermediate: 0.85,
  advanced: 1,
  expert: 1,
};

/**
 * POST /job-recommendations
 *
 * Scores open roles against a set of skills. The previous implementation used
 * exact array equality, so "React JS" never matched "React", and it gave a flat
 * 50 to any job with no listed skills while returning nothing that said which
 * skills were missing.
 *
 * Body: { skills?: string[], limit?: number }
 * Falls back to the signed-in user's profile skills when the body omits them.
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { skills, limit } = req.body || {};

    const requestedLimit = Math.min(Math.max(parseInt(limit || '10', 10) || 10, 1), 50);

    let skillsSource = 'request';

    // The client used to be the only source of skills, so the quality of the
    // recommendation depended entirely on what the browser remembered to send.
    let userSkills = Array.isArray(skills) ? skills.map(String).map((skill) => skill.trim()).filter(Boolean) : [];

    // Always read the profile: it carries proficiency levels, which is how a
    // "beginner React" and an "expert React" end up scoring differently, and
    // the job preferences used to explain each result.
    const profile = await JobSeekerProfile.findOne({ user_id: req.userId }).select('skillDetails skills preferences');

    if (!userSkills.length) {
      userSkills = [
        ...(profile?.skillDetails || []).map((entry) => entry.skill_name),
        ...(profile?.skills || []),
      ]
        .filter(Boolean)
        .map((skill) => String(skill).trim());
      skillsSource = 'profile';
    }

    if (!userSkills.length) {
      return res.status(400).json({
        error: 'No skills available to match against. Add skills to your profile first.',
        skillsSource,
      });
    }

    // Skill -> weight, derived from the proficiency the user declared.
    const weightBySkill = new Map();
    (profile?.skillDetails || []).forEach((entry) => {
      const name = String(entry.skill_name || '').trim();
      if (!name) return;
      const level = String(entry.proficiency_level || '').toLowerCase();
      weightBySkill.set(name, PROFICIENCY_WEIGHT[level] ?? 0.85);
    });

    // Skills supplied in the request that are not on the profile still count,
    // at a neutral weight.
    userSkills.forEach((name) => {
      if (![...weightBySkill.keys()].some((key) => skillsMatch(key, name))) {
        weightBySkill.set(name, 0.85);
      }
    });

    // Pull more than we need so a strong match is not hidden past the cutoff.
    const jobs = await Job.find({ status: 'active' }).sort({ created: -1 }).limit(300).lean();

    // Job preferences are the other half of a good match. They do not change
    // the skill score, but they tell the candidate why a role does or does not
    // suit them, which a bare percentage cannot.
    const preferences = profile?.preferences || {};
    const desiredRoles = (preferences.desired_roles || []).map((role) => String(role).toLowerCase());
    const preferredLocations = (preferences.preferred_locations || []).map((location) => String(location).toLowerCase());
    const openToRelocate = Boolean(preferences.open_to_relocate);
    const salaryFloor = Number(preferences.expected_salary_min) || 0;

    const matchesAny = (value, needles) => {
      const haystack = String(value || '').toLowerCase();
      return needles.some((needle) => needle && haystack.includes(needle));
    };

    const scored = jobs.map((job) => {
      const requiredSkills = (job.required_skills || []).map(String).filter(Boolean);
      const coverage = resolveSkillCoverage(requiredSkills, [...weightBySkill.keys()]);

      const matched = coverage.filter(({ matchedBy }) => matchedBy !== null);
      const missing = coverage.filter(({ matchedBy }) => matchedBy === null);

      // Weighted coverage: holding a required skill at "Beginner" counts less
      // than holding it at "Expert".
      const earned = matched.reduce((sum, { skill }) => {
        const key = [...weightBySkill.keys()].find((candidate) => skillsMatch(candidate, skill));
        return sum + (weightBySkill.get(key) ?? 0.85);
      }, 0);
      const possible = requiredSkills.reduce((sum, { skill }) => {
        const key = [...weightBySkill.keys()].find((candidate) => skillsMatch(candidate, skill));
        return sum + (weightBySkill.get(key) ?? 0.85);
      }, 0);

      // A job with no listed skills cannot be mismatched, so it is ranked in
      // the middle rather than being scored 0 or a flat 50.
      const matchScore = requiredSkills.length && possible > 0
        ? Math.round((earned / possible) * 100)
        : 50;

      // Preference alignment, reported separately from the skill score.
      const roleMatch = matchesAny(job.title, desiredRoles);
      const locationMatch = matchesAny(job.location, preferredLocations);
      const remoteMatch = preferences.work_arrangement === 'any' || job.remoteType === preferences.work_arrangement;
      const typeMatch = preferences.job_type === 'any' || job.jobType === preferences.job_type;
      const levelMatch = preferences.experience_level === 'any' || job.experience_level === preferences.experience_level;
      const paysWell = !salaryFloor || Number(job.salary_max || job.salary_min || 0) >= salaryFloor;

      const notes = [];
      if (roleMatch) notes.push('Title matches a role you want');
      if (locationMatch) notes.push('In a location you prefer');
      if (!remoteMatch && preferences.work_arrangement !== 'any') {
        notes.push(`${preferences.work_arrangement} preferred, this is ${job.remoteType || 'unspecified'}`);
      }
      if (!typeMatch && preferences.job_type !== 'any') {
        notes.push(`${preferences.job_type} preferred, this is ${job.jobType || 'unspecified'}`);
      }
      if (!levelMatch && preferences.experience_level !== 'any') {
        notes.push(`${preferences.experience_level} level preferred`);
      }
      if (!paysWell) notes.push('Pays below your expected minimum');
      if (!locationMatch && !openToRelocate && preferredLocations.length) {
        notes.push('Outside your preferred locations');
      }

      return {
        id: String(job._id),
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        description: job.description,
        matchScore: Math.min(matchScore, 100),
        jobType: job.jobType,
        remoteType: job.remoteType,
        experienceLevel: job.experience_level,
        requiredSkills,
        matchedSkills: matched.map(({ skill, matchedBy }) => ({ skill, yourSkill: matchedBy })),
        missingSkills: missing.map(({ skill }) => skill),
        preferenceNotes: notes,
        preferencesMatched: roleMatch || (locationMatch && remoteMatch),
        created: job.created,
      };
    });

    // Strong matches first. Jobs with no requirements sink to the bottom so
    // they cannot outrank a genuine match on the flat 50.
    const ranked = scored
      .sort((a, b) => {
        const aReal = a.requiredSkills.length ? 1 : 0;
        const bReal = b.requiredSkills.length ? 1 : 0;
        if (aReal !== bReal) return bReal - aReal;
        return b.matchScore - a.matchScore;
      })
      .slice(0, requestedLimit);

    res.json({
      recommendations: ranked,
      totalJobsScored: jobs.length,
      skillsSource,
      // Say so explicitly rather than returning an empty array the UI has to guess at.
      needsProfile: skillsSource === 'profile' && !userSkills.length,
    });
  } catch (error) {
    logger.error('Job recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /job-recommendations/roles/:title
 *
 * Recommendations for an open role: which of its skills you already cover and
 * which are the gaps worth closing. Backs the "what am I missing for this job?"
 * question on the job detail page.
 */
router.get('/roles/:title', authMiddleware, async (req, res) => {
  try {
    const [profile, jobs] = await Promise.all([
      JobSeekerProfile.findOne({ user_id: req.userId }).select('skillDetails'),
      Job.find({ status: 'active', title: { $regex: req.params.title, $options: 'i' } }).limit(20).lean(),
    ]);

    const userSkills = (profile?.skillDetails || []).map((entry) => entry.skill_name).filter(Boolean);

    const required = [...new Set(jobs.flatMap((job) => job.required_skills || []).map(String))];
    const coverage = resolveSkillCoverage(required, userSkills);

    res.json({
      role: req.params.title,
      matchedJobs: jobs.map((job) => ({ id: String(job._id), title: job.title, company: job.company })),
      matchedSkills: coverage.filter(({ matchedBy }) => matchedBy).map(({ skill, matchedBy }) => ({ skill, yourSkill: matchedBy })),
      missingSkills: coverage.filter(({ matchedBy }) => !matchedBy).map(({ skill }) => skill),
      hasProfile: userSkills.length > 0,
    });
  } catch (error) {
    logger.error('Role skill lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
