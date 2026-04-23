import express from 'express';
import multer from 'multer';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadDir = path.join(process.cwd(), 'uploads');

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

    await profile.save();
    res.json(formatProfile(profile));
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
    profile.skillDetails.push({
      skill_name: req.body.skill_name || '',
      proficiency_level: req.body.proficiency_level || 'Beginner',
      endorsement_count: req.body.endorsement_count || 0,
    });
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
    skill.proficiency_level = req.body.proficiency_level || skill.proficiency_level;
    skill.endorsement_count = req.body.endorsement_count ?? skill.endorsement_count;
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
    const filepath = path.join(process.cwd(), relativePath);
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
      const filepath = path.join(process.cwd(), relativePath);
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
