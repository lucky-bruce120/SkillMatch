import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
import { UPLOAD_DIR } from '../utils/paths.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadDir = UPLOAD_DIR;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ensureProfile = async (userId) => {
  let profile = await JobSeekerProfile.findOne({ user_id: userId });
  if (!profile) {
    profile = new JobSeekerProfile({ user_id: userId });
  }
  return profile;
};

const splitFullName = (fullName = '') => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

const mapSkill = (skill) => ({
  id: String(skill._id),
  skill_name: skill.skill_name || '',
  proficiency_level: skill.proficiency_level || 'Beginner',
  endorsement_count: skill.endorsement_count || 0,
});

const mapExperience = (experience) => ({
  id: String(experience._id),
  job_title: experience.job_title || experience.title || '',
  company: experience.company || '',
  employment_type: experience.employment_type || '',
  start_date: experience.start_date || experience.startDate || null,
  end_date: experience.end_date || experience.endDate || null,
  currently_working: Boolean(experience.currently_working),
  description: experience.description || '',
});

const mapEducation = (education) => ({
  id: String(education._id),
  school: education.school || education.institution || '',
  degree: education.degree || '',
  field: education.field || education.field_of_study || '',
  field_of_study: education.field_of_study || education.field || '',
  grade: education.grade || '',
  start_date: education.start_date || null,
  end_date: education.end_date || null,
  graduation_year: education.graduation_year || education.graduationYear || null,
});

const formatProfile = (profile) => {
  const fullName = profile.full_name || [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  const skills = (profile.skillDetails || []).map(mapSkill);
  const experience = (profile.experience || []).map(mapExperience);
  const education = (profile.education || []).map(mapEducation);
  const preferences = profile.preferences || {};
  const completedFields = [
    fullName,
    profile.bio,
    profile.location || profile.address,
    profile.phone,
    profile.cv,
    skills.length,
    experience.length,
    education.length,
    profile.linkedin_url,
    profile.picture,
  ].filter(Boolean).length;
  const profileStrength = Math.round((completedFields / 10) * 100);

  return {
    id: String(profile._id),
    _id: String(profile._id),
    user_id: String(profile.user_id),
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    full_name: fullName,
    bio: profile.bio || '',
    location: profile.location || profile.address || '',
    address: profile.address || profile.location || '',
    phone: profile.phone || '',
    date_of_birth: profile.date_of_birth || null,
    gender: profile.gender || '',
    nationality: profile.nationality || '',
    linkedin_url: profile.linkedin_url || '',
    portfolio_url: profile.portfolio_url || '',
    github_url: profile.github_url || '',
    picture: profile.picture || null,
    cv: profile.cv || null,
    cv_file: profile.cv || null,
    profile_strength: profileStrength,
    skills,
    education,
    experience,
    // Always return a fully-populated object so the client never has to guard
    // against a missing `preferences` key.
    preferences: {
      desired_roles: preferences.desired_roles || [],
      preferred_locations: preferences.preferred_locations || [],
      work_arrangement: preferences.work_arrangement || 'any',
      job_type: preferences.job_type || 'any',
      experience_level: preferences.experience_level || 'any',
      expected_salary_min: preferences.expected_salary_min ?? null,
      expected_salary_max: preferences.expected_salary_max ?? null,
      availability: preferences.availability || '',
      open_to_relocate: Boolean(preferences.open_to_relocate),
      profile_visible: preferences.profile_visible !== false,
    },
    created: profile.created,
    updated: profile.updated,
  };
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user_id: req.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(formatProfile(profile));
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /profile/public/:userId
 *
 * A job seeker's profile, viewable by anyone who has the link. This is what
 * lets an employer open a candidate's details from a shared URL instead of
 * only through their own application list.
 *
 * The profile is still a profile, not an account: it exposes the professional
 * details and never the password, role or contact details the candidate has
 * not chosen to publish (the `profile_visible` preference).
 */
router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const profile = await JobSeekerProfile.findOne({ user_id: userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const user = await User.findById(userId).select('email role');
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const preferences = profile.preferences || {};
    const isVisible = preferences.profile_visible !== false;

    res.json({
      ...formatProfile(profile),
      // Respect the candidate's choice about who can see their details.
      email: isVisible ? user.email : '',
      phone: isVisible ? (profile.phone || '') : '',
      profile_visible: isVisible,
    });
  } catch (error) {
    logger.error('Public profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    const updateData = req.body;
    const { firstName, lastName } = splitFullName(updateData.full_name);

    profile.full_name = updateData.full_name || '';
    profile.firstName = firstName;
    profile.lastName = lastName;
    profile.bio = updateData.bio || '';
    profile.location = updateData.location || '';
    profile.address = updateData.location || '';
    profile.phone = updateData.phone || '';
    profile.date_of_birth = updateData.date_of_birth || null;
    profile.gender = updateData.gender || '';
    profile.nationality = updateData.nationality || '';
    profile.linkedin_url = updateData.linkedin_url || '';
    profile.portfolio_url = updateData.portfolio_url || '';
    profile.github_url = updateData.github_url || '';

    // Job preferences. Only overwrite a key when the client actually sent it,
    // so a partial update (e.g. the personal-info form) does not wipe them.
    if (updateData.preferences && typeof updateData.preferences === 'object') {
      const incoming = updateData.preferences;
      const preferences = profile.preferences || {};

      if (Array.isArray(incoming.desired_roles)) {
        preferences.desired_roles = incoming.desired_roles.map(String).map((role) => role.trim()).filter(Boolean).slice(0, 10);
      }
      if (Array.isArray(incoming.preferred_locations)) {
        preferences.preferred_locations = incoming.preferred_locations.map(String).map((location) => location.trim()).filter(Boolean).slice(0, 10);
      }
      if (incoming.work_arrangement !== undefined) {
        preferences.work_arrangement = ['any', 'remote', 'hybrid', 'on-site'].includes(incoming.work_arrangement)
          ? incoming.work_arrangement
          : 'any';
      }
      if (incoming.job_type !== undefined) {
        preferences.job_type = ['any', 'full-time', 'part-time', 'contract', 'internship'].includes(incoming.job_type)
          ? incoming.job_type
          : 'any';
      }
      if (incoming.experience_level !== undefined) {
        preferences.experience_level = ['any', 'entry', 'mid', 'senior', 'executive'].includes(incoming.experience_level)
          ? incoming.experience_level
          : 'any';
      }
      if (incoming.expected_salary_min !== undefined) {
        const value = Number(incoming.expected_salary_min);
        preferences.expected_salary_min = Number.isFinite(value) && value > 0 ? value : null;
      }
      if (incoming.expected_salary_max !== undefined) {
        const value = Number(incoming.expected_salary_max);
        preferences.expected_salary_max = Number.isFinite(value) && value > 0 ? value : null;
      }
      if (incoming.availability !== undefined) {
        preferences.availability = String(incoming.availability || '').trim().slice(0, 80);
      }
      if (incoming.open_to_relocate !== undefined) {
        preferences.open_to_relocate = Boolean(incoming.open_to_relocate);
      }
      if (incoming.profile_visible !== undefined) {
        preferences.profile_visible = Boolean(incoming.profile_visible);
      }

      // Keep min/max coherent so the UI never shows max below min.
      if (
        preferences.expected_salary_min &&
        preferences.expected_salary_max &&
        preferences.expected_salary_max < preferences.expected_salary_min
      ) {
        preferences.expected_salary_max = preferences.expected_salary_min;
      }

      profile.preferences = preferences;
    }

    await profile.save();
    res.json(formatProfile(profile));
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Keep the flat `skills` array in step with `skillDetails`.
 *
 * The profile has two skill stores: a plain `[String]` and the richer
 * `skillDetails` array. Only `skillDetails` was ever written to, which left
 * `skills` permanently empty and made skill-count stats read zero while
 * job-market analytics double-counted nothing. Every skill write now mirrors
 * across both.
 */
const syncSkillNames = (profile) => {
  const seen = new Set();
  profile.skills = (profile.skillDetails || [])
    .map((entry) => (entry.skill_name || '').trim())
    .filter((name) => {
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/** Canonical proficiency levels, so matching does not have to guess casing. */
const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const normalizeProficiency = (value, fallback = 'Beginner') => {
  const match = PROFICIENCY_LEVELS.find(
    (level) => level.toLowerCase() === String(value || '').trim().toLowerCase()
  );
  return match || fallback;
};

router.get('/skills', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    res.json((profile.skillDetails || []).map(mapSkill));
  } catch (error) {
    logger.error('Skills fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/skills', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);

    const skillName = (req.body.skill_name || '').trim();
    if (!skillName) {
      return res.status(400).json({ error: 'skill_name is required' });
    }

    const alreadyListed = (profile.skillDetails || []).some(
      (entry) => String(entry.skill_name).trim().toLowerCase() === skillName.toLowerCase()
    );
    if (alreadyListed) {
      return res.status(400).json({ error: 'That skill is already on your profile' });
    }

    profile.skillDetails.push({
      skill_name: skillName,
      proficiency_level: normalizeProficiency(req.body.proficiency_level),
      endorsement_count: Number(req.body.endorsement_count) || 0,
    });
    syncSkillNames(profile);
    await profile.save();
    res.status(201).json(mapSkill(profile.skillDetails[profile.skillDetails.length - 1]));
  } catch (error) {
    logger.error('Skill create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/skills/:id', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    const skill = profile.skillDetails.id(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    skill.skill_name = req.body.skill_name || skill.skill_name;
    skill.proficiency_level = normalizeProficiency(req.body.proficiency_level, skill.proficiency_level);
    skill.endorsement_count = req.body.endorsement_count ?? skill.endorsement_count;
    syncSkillNames(profile);
    await profile.save();
    res.json(mapSkill(skill));
  } catch (error) {
    logger.error('Skill update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/skills/:id', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    const skill = profile.skillDetails.id(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    skill.deleteOne();
    syncSkillNames(profile);
    await profile.save();
    res.json({ success: true });
  } catch (error) {
    logger.error('Skill delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/education', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    res.json((profile.education || []).map(mapEducation));
  } catch (error) {
    logger.error('Education fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/education', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    profile.education.push({
      school: req.body.school || '',
      institution: req.body.school || '',
      degree: req.body.degree || '',
      field: req.body.field || req.body.field_of_study || '',
      field_of_study: req.body.field_of_study || req.body.field || '',
      grade: req.body.grade || '',
      start_date: req.body.start_date || null,
      end_date: req.body.end_date || null,
      graduation_year: req.body.graduation_year || null,
      graduationYear: req.body.graduation_year || null,
    });
    await profile.save();
    res.status(201).json(mapEducation(profile.education[profile.education.length - 1]));
  } catch (error) {
    logger.error('Education create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/education/:id', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    const education = profile.education.id(req.params.id);
    if (!education) {
      return res.status(404).json({ error: 'Education not found' });
    }

    education.school = req.body.school || education.school;
    education.institution = req.body.school || education.institution;
    education.degree = req.body.degree || education.degree;
    education.field = req.body.field || req.body.field_of_study || education.field;
    education.field_of_study = req.body.field_of_study || req.body.field || education.field_of_study;
    education.grade = req.body.grade || education.grade;
    education.start_date = req.body.start_date || null;
    education.end_date = req.body.end_date || null;
    education.graduation_year = req.body.graduation_year || education.graduation_year;
    education.graduationYear = education.graduation_year;

    await profile.save();
    res.json(mapEducation(education));
  } catch (error) {
    logger.error('Education update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/education/:id', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    const education = profile.education.id(req.params.id);
    if (!education) {
      return res.status(404).json({ error: 'Education not found' });
    }

    education.deleteOne();
    await profile.save();
    res.json({ success: true });
  } catch (error) {
    logger.error('Education delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/experience', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    res.json((profile.experience || []).map(mapExperience));
  } catch (error) {
    logger.error('Experience fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/experience', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    profile.experience.push({
      job_title: req.body.job_title || req.body.title || '',
      title: req.body.job_title || req.body.title || '',
      company: req.body.company || '',
      employment_type: req.body.employment_type || '',
      start_date: req.body.start_date || null,
      end_date: req.body.end_date || null,
      currently_working: Boolean(req.body.currently_working),
      description: req.body.description || '',
    });
    await profile.save();
    res.status(201).json(mapExperience(profile.experience[profile.experience.length - 1]));
  } catch (error) {
    logger.error('Experience create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/experience/:id', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    const experience = profile.experience.id(req.params.id);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    experience.job_title = req.body.job_title || req.body.title || experience.job_title;
    experience.title = experience.job_title;
    experience.company = req.body.company || experience.company;
    experience.employment_type = req.body.employment_type || experience.employment_type;
    experience.start_date = req.body.start_date || null;
    experience.end_date = req.body.end_date || null;
    experience.currently_working = Boolean(req.body.currently_working);
    experience.description = req.body.description || experience.description;

    await profile.save();
    res.json(mapExperience(experience));
  } catch (error) {
    logger.error('Experience update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/experience/:id', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.userId);
    const experience = profile.experience.id(req.params.id);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    experience.deleteOne();
    await profile.save();
    res.json({ success: true });
  } catch (error) {
    logger.error('Experience delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/cv', authMiddleware, async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user_id: req.userId });
    if (!profile || !profile.cv) {
      return res.status(404).json({ error: 'CV not found' });
    }

    const relativePath = profile.cv.replace(/^\/+/, '');
    const filepath = path.join(UPLOAD_DIR, relativePath);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'CV file not found on disk' });
    }

    const filename = path.basename(filepath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filepath).pipe(res);
  } catch (error) {
    logger.error('CV download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upload-cv', authMiddleware, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CV file is required' });
    }

    const profile = await ensureProfile(req.userId);
    const filename = `${req.userId}-cv-${Date.now()}${path.extname(req.file.originalname)}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    profile.cv = `/uploads/${filename}`;
    await profile.save();

    res.json(formatProfile(profile));
  } catch (error) {
    logger.error('CV upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upload-picture', authMiddleware, upload.single('picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Picture file is required' });
    }

    const profile = await ensureProfile(req.userId);
    const filename = `${req.userId}-picture-${Date.now()}${path.extname(req.file.originalname)}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    profile.picture = `/uploads/${filename}`;
    await profile.save();

    res.json(formatProfile(profile));
  } catch (error) {
    logger.error('Picture upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/remove-picture', authMiddleware, async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user_id: req.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.picture) {
      const relativePath = profile.picture.replace(/^\/+/, '');
      const filepath = path.join(UPLOAD_DIR, relativePath);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    profile.picture = null;
    await profile.save();
    res.json(formatProfile(profile));
  } catch (error) {
    logger.error('Picture remove error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
