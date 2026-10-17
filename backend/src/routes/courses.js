import 'dotenv/config';
import express from 'express';
import Course from '../models/Course.js';
import { skillsMatch } from '../utils/ai.js';
import { escapeRegex } from '../utils/sanitize.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Shape a course for the client.
 *
 * The frontend previously read `rating`, `duration` and `course_url`, none of
 * which exist on the schema, so those cards always rendered "N/A" and a dead
 * link. Everything the UI needs is normalised here instead.
 */
const toCourseDto = (course, matchedSkills = [], relevance = 0) => ({
  id: String(course._id),
  title: course.title || 'Untitled course',
  description: course.description || '',
  category: course.category || 'General',
  difficulty_level: course.difficulty_level || 'beginner',
  provider: course.provider || '',
  url: course.url || course.course_url || '',
  rating: course.rating ?? null,
  duration: course.duration || '',
  skills: course.skills || [],
  relevance,
  matchedSkills,
});

/**
 * Score how well a course serves the requested skill gaps.
 *
 * Title matches are weighted highest, then skills tags, then description. The
 * old implementation ran a +2/+1 substring scan in the browser, which meant
 * filtering by difficulty silently emptied the list.
 */
const scoreCourse = (course, targetSkills) => {
  if (!targetSkills.length) return 0;

  const title = String(course.title || '').toLowerCase();
  const description = String(course.description || '').toLowerCase();
  const category = String(course.category || '').toLowerCase();
  const tags = (course.skills || []).map((skill) => String(skill).toLowerCase());

  let score = 0;
  const matchedSkills = [];

  targetSkills.forEach((target) => {
    const needle = target.trim().toLowerCase();
    if (!needle) return;

    let hit = 0;
    if (tags.some((tag) => skillsMatch(tag, needle))) hit = 4;
    else if (title.includes(needle)) hit = 3;
    else if (category.includes(needle)) hit = 2;
    else if (description.includes(needle)) hit = 1;

    if (hit > 0) {
      score += hit;
      matchedSkills.push(target);
    }
  });

  return { score, matchedSkills };
};

/**
 * GET /courses/recommendations
 *
 * `skill_gaps` is optional. Previously the frontend sent the literal string
 * "general" when the user had no gaps, which matched nothing and rendered an
 * empty page. With no gaps we now return the full catalogue.
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { skill_gaps: skillGaps, difficulty_level: difficultyLevel } = req.query;

    const targetSkills = (Array.isArray(skillGaps) ? skillGaps : String(skillGaps || '').split(','))
      .map((skill) => String(skill).trim())
      .filter(Boolean)
      .slice(0, 15);

    const query = {};
    if (difficultyLevel && difficultyLevel !== 'all') {
      query.difficulty_level = difficultyLevel;
    }

    // Pull a wider set than we intend to return so ranking has room to work.
    let candidates = await Course.find(query).limit(300).lean();

    if (targetSkills.length) {
      // Narrow with a regex OR across the gap skills, but never let a search
      // return an empty page when the catalogue clearly has content.
      const or = targetSkills.map((skill) => {
        const safe = escapeRegex(skill);
        return {
          $or: [
            { title: { $regex: safe, $options: 'i' } },
            { description: { $regex: safe, $options: 'i' } },
            { category: { $regex: safe, $options: 'i' } },
            { skills: { $regex: safe, $options: 'i' } },
          ],
        };
      });

      const narrowed = await Course.find({ ...query, $or: or }).limit(300).lean();
      if (narrowed.length) candidates = narrowed;
    }

    const ranked = candidates
      .map((course) => {
        const { score, matchedSkills } = scoreCourse(course, targetSkills);
        return toCourseDto(course, matchedSkills, score);
      })
      // With gaps: most relevant first. Without: stable, predictable order.
      .sort((a, b) =>
        targetSkills.length
          ? b.relevance - a.relevance || (b.rating || 0) - (a.rating || 0)
          : (b.rating || 0) - (a.rating || 0)
      )
      .slice(0, 60);

    // Skills that none of the returned courses actually cover, so the UI can
    // say so honestly instead of silently showing fewer courses than gaps.
    const covered = new Set(ranked.flatMap((course) => course.matchedSkills));
    const uncoveredSkills = targetSkills.filter((skill) => !covered.has(skill));

    res.json({
      courses: ranked,
      total: ranked.length,
      skillGaps: targetSkills,
      coveredSkills: targetSkills.filter((skill) => covered.has(skill)),
      uncoveredSkills,
    });
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /courses/categories - distinct categories and difficulties, so the
 * filter dropdowns cannot offer a value that filters everything away.
 */
router.get('/categories', async (req, res) => {
  try {
    const [categories, difficulties] = await Promise.all([
      Course.distinct('category'),
      Course.distinct('difficulty_level'),
    ]);

    res.json({
      categories: categories.filter(Boolean).sort(),
      difficulties: difficulties.filter(Boolean).sort(),
    });
  } catch (error) {
    logger.error('Get course categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
