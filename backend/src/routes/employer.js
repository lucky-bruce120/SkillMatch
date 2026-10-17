import express from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Company details an employer can edit about themselves.
 * Deliberately separate from Job: a job is a per-posting entity, this is the
 * company identity that appears on every listing.
 */
const EDITABLE_EMPLOYER_FIELDS = [
  'company_name',
  'company_description',
  'company_website',
  'company_size',
  'industry',
  'location',
  'contact_email',
  'contact_phone',
  'hiring_contact',
];

const formatEmployerProfile = (profile) => ({
  id: String(profile._id),
  _id: String(profile._id),
  user_id: String(profile.user_id),
  company_name: profile.company_name || '',
  company_description: profile.company_description || '',
  company_website: profile.company_website || '',
  company_size: profile.company_size || '',
  industry: profile.industry || '',
  location: profile.location || '',
  contact_email: profile.contact_email || '',
  contact_phone: profile.contact_phone || '',
  hiring_contact: profile.hiring_contact || '',
  created: profile.created,
  updated: profile.updated,
});

const mapCandidateProfile = (profile, user) => ({
  id: String(profile._id),
  _id: String(profile._id),
  user_id: String(profile.user_id),
  full_name: profile.full_name || [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || user.email,
  bio: profile.bio || '',
  location: profile.location || profile.address || '',
  phone: profile.phone || '',
  email: user.email,
  picture: profile.picture || null,
  cv: profile.cv || null,
  cv_file: profile.cv || null,
  skills: (profile.skillDetails || []).map((skill) => ({
    id: String(skill._id),
    skill_name: skill.skill_name || '',
    proficiency_level: skill.proficiency_level || 'Beginner',
    endorsement_count: skill.endorsement_count || 0,
  })),
  experience: (profile.experience || []).map((item) => ({
    id: String(item._id),
    position: item.job_title || item.title || '',
    company: item.company || '',
    start_date: item.start_date || item.startDate || null,
    end_date: item.end_date || item.endDate || null,
    description: item.description || '',
  })),
  education: (profile.education || []).map((item) => ({
    id: String(item._id),
    school: item.school || item.institution || '',
    degree: item.degree || '',
    field: item.field || item.field_of_study || '',
    graduation_year: item.graduation_year || item.graduationYear || null,
  })),
});

/**
 * Coerce a skills field into a clean array of strings.
 * Accepts an array, a comma-separated string, or nothing.
 */
const normalizeSkills = (value) => {
  if (Array.isArray(value)) {
    return value.map((skill) => String(skill).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((skill) => skill.trim()).filter(Boolean);
  }
  return [];
};

/**
 * GET /employer/profile
 *
 * The EmployerProfile model existed and was read when notifying employers, but
 * there was no endpoint to view or edit it, so an employer had no way to set
 * their company details. Returns an empty profile rather than 404 when one has
 * not been created yet.
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ user_id: req.userId });

    if (!profile) {
      return res.json({
        id: null,
        _id: null,
        user_id: String(req.userId),
        company_name: '',
        company_description: '',
        company_website: '',
        company_size: '',
        industry: '',
        location: '',
        contact_email: req.userEmail || '',
        contact_phone: '',
        hiring_contact: '',
        exists: false,
        created: null,
        updated: null,
      });
    }

    res.json({ ...formatEmployerProfile(profile), exists: true });
  } catch (error) {
    logger.error('Get employer profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /employer/profile - create or update the company profile. */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const updateData = req.body || {};

    if (updateData.company_website) {
      const website = String(updateData.company_website).trim();
      if (!/^https?:\/\/.+/i.test(website)) {
        return res.status(400).json({ error: 'Company website must start with http:// or https://' });
      }
    }

    if (updateData.contact_email) {
      const email = String(updateData.contact_email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Contact email is not a valid email address' });
      }
    }

    const profile = await EmployerProfile.findOneAndUpdate(
      { user_id: req.userId },
      {
        $set: EDITABLE_EMPLOYER_FIELDS.reduce((set, field) => {
          if (updateData[field] !== undefined) {
            set[field] = typeof updateData[field] === 'string'
              ? updateData[field].trim()
              : updateData[field];
          }
          return set;
        }, {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json({ ...formatEmployerProfile(profile), exists: true });
  } catch (error) {
    logger.error('Update employer profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/jobs - Get jobs posted by current employer
router.get('/jobs', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    const jobs = await Job.find({ employer_id: employerId })
      .sort({ created: -1 })
      .populate('employer_id', 'email');

    res.json(jobs);
  } catch (error) {
    logger.error('Get employer jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /employer/jobs - Create a new job
router.post('/jobs', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;
    const {
      title,
      company,
      location,
      description,
      required_skills,
      salary_min,
      salary_max,
      job_type,
      remote_type,
      experience_level,
      status
    } = req.body;

    // Map frontend values to backend enum values
    const jobTypeMapping = {
      'Full-time': 'full-time',
      'Part-time': 'part-time',
      'Contract': 'contract',
      'Internship': 'internship',
      'full_time': 'full-time',
      'part_time': 'part-time',
      'contract': 'contract',
      'internship': 'internship'
    };

    const remoteTypeMapping = {
      'Remote': 'remote',
      'On-site': 'on-site',
      'Hybrid': 'hybrid',
      'remote': 'remote',
      'on_site': 'on-site',
      'hybrid': 'hybrid'
    };

    const experienceLevelMapping = {
      'Entry-level': 'entry',
      'Mid-level': 'mid',
      'Senior': 'senior',
      'Executive': 'executive'
    };

    const statusMapping = {
      'published': 'active',
      'draft': 'draft',
      'active': 'active',
      'inactive': 'inactive'
    };

    const job = new Job({
      title,
      description,
      company,
      location,
      salary_min,
      salary_max,
      salary: salary_min || salary_max ? Math.max(salary_min || 0, salary_max || 0) : undefined,
      jobType: jobTypeMapping[job_type] || job_type?.toLowerCase(),
      remoteType: remoteTypeMapping[remote_type] || remote_type?.toLowerCase(),
      // Accept either a comma-separated string or an array. This previously
      // called .split() unconditionally, so a client sending a JSON array (the
      // natural shape) got a 500 instead of a created job.
      required_skills: normalizeSkills(required_skills),
      experience_level: experienceLevelMapping[experience_level] || experience_level?.toLowerCase(),
      status: statusMapping[status] || 'active',
      employer_id: employerId,
    });

    await job.save();

    res.status(201).json(job);
  } catch (error) {
    logger.error('Create job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /employer/jobs/:jobId - Delete a job
router.delete('/jobs/:jobId', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const employerId = req.userId;

    const job = await Job.findOneAndDelete({
      _id: jobId,
      employer_id: employerId
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/jobs/:jobId/applications - Get applications for a specific job
router.get('/jobs/:jobId/applications', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const employerId = req.userId;

    // Verify the job belongs to this employer
    const job = await Job.findOne({ _id: jobId, employer_id: employerId });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const applications = await Application.find({ job_id: jobId })
      .sort({ applied_at: -1 })
      .populate('job_seeker_id', 'email')
      .populate('job_id', 'title company');

    res.json(applications);
  } catch (error) {
    logger.error('Get job applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/applications - Get all applications for employer's jobs
router.get('/applications', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Get all jobs by this employer
    const employerJobs = await Job.find({ employer_id: employerId }, '_id');

    if (employerJobs.length === 0) {
      return res.json([]);
    }

    const jobIds = employerJobs.map(job => job._id);

    const applications = await Application.find({ job_id: { $in: jobIds } })
      .sort({ applied_at: -1 })
      .populate('job_seeker_id', 'email')
      .populate('job_id', 'title company location');

    res.json(applications);
  } catch (error) {
    logger.error('Get employer applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/candidates/:candidateId - Get candidate profile for employers
router.get('/candidates/:candidateId', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;
    const { candidateId } = req.params;

    const employerJobs = await Job.find({ employer_id: employerId }, '_id');
    const jobIds = employerJobs.map((job) => job._id);

    const application = await Application.findOne({
      job_id: { $in: jobIds },
      job_seeker_id: candidateId,
    });

    if (!application) {
      return res.status(404).json({ error: 'Candidate not found for this employer' });
    }

    const [user, profile] = await Promise.all([
      User.findById(candidateId).select('email'),
      JobSeekerProfile.findOne({ user_id: candidateId }),
    ]);

    if (!user || !profile) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }

    res.json(mapCandidateProfile(profile, user));
  } catch (error) {
    logger.error('Get candidate profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /employer/applications/:applicationId/status - Update application status
router.put('/applications/:applicationId/status', authMiddleware, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, feedback } = req.body;
    const employerId = req.userId;

    // Find the application and verify it belongs to employer's job
    const application = await Application.findById(applicationId)
      .populate('job_id', 'employer_id');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.job_id.employer_id.toString() !== employerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    application.status = status;
    if (feedback) {
      application.feedback = feedback;
    }
    await application.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Update application status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Get job count
    const jobCount = await Job.countDocuments({ employer_id: employerId });

    // Get application count
    const employerJobs = await Job.find({ employer_id: employerId }, '_id');
    const jobIds = employerJobs.map(job => job._id);
    const applicationCount = await Application.countDocuments({
      job_id: { $in: jobIds }
    });

    // Get pending interview count. 'shortlisted' is not part of the
    // Application.status enum, so only real statuses are counted here.
    const interviewCount = await Application.countDocuments({
      job_id: { $in: jobIds },
      status: 'accepted'
    });

    res.json({
      jobs: jobCount,
      applications: applicationCount,
      interviews: interviewCount
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /employer/dashboard/recent-applications - Get recent applications
router.get('/dashboard/recent-applications', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Get all jobs by this employer
    const employerJobs = await Job.find({ employer_id: employerId }, '_id');

    if (employerJobs.length === 0) {
      return res.json([]);
    }

    const jobIds = employerJobs.map(job => job._id);

    const applications = await Application.find({ job_id: { $in: jobIds } })
      .sort({ applied_at: -1 })
      .limit(5)
      .populate('job_seeker_id', 'email')
      .populate('job_id', 'title company');

    res.json(applications);
  } catch (error) {
    logger.error('Get recent applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
