import express from 'express';
import SavedJob from '../models/SavedJob.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /saved-jobs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const savedJobs = await SavedJob.find({ user_id: userId })
      .populate('job_id')
      .sort({ created: -1 });

    // Map the populated job to a plain object.
    //
    // The populated document is a Mongoose subdocument, and the `id` virtual
    // does not survive being nested inside a plain object like this. The
    // frontend's JobCard links to `/job/${job.id}`, so without an explicit
    // `id` every "View Details" button pointed at /job/undefined and 404'd.
    // Also drop bookmarks whose job has since been deleted, rather than
    // sending nulls the UI would try to render.
    const formattedSavedJobs = savedJobs
      .filter((saved) => saved.job_id)
      .map((saved) => {
        const job = saved.job_id.toObject ? saved.job_id.toObject() : { ...saved.job_id };

        return {
          id: String(saved._id),
          job_id: String(job._id),
          user_id: String(saved.user_id),
          created: saved.created,
          job: {
            id: String(job._id),
            _id: String(job._id),
            title: job.title || 'Removed job',
            company: job.company || '',
            location: job.location || '',
            description: job.description || '',
            salary: job.salary ?? null,
            salary_min: job.salary_min ?? null,
            salary_max: job.salary_max ?? null,
            jobType: job.jobType || '',
            remoteType: job.remoteType || '',
            experience_level: job.experience_level || '',
            required_skills: job.required_skills || [],
            status: job.status || '',
            created: job.created,
          },
        };
      });

    res.json(formattedSavedJobs);
  } catch (error) {
    logger.error('Get saved jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /saved-jobs
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { job_id } = req.body;
    const userId = req.userId;

    // Check if already saved
    const existing = await SavedJob.findOne({
      user_id: userId,
      job_id: job_id
    });

    if (existing) {
      return res.status(400).json({ error: 'Job already saved' });
    }

    const savedJob = new SavedJob({
      user_id: userId,
      job_id: job_id
    });

    await savedJob.save();

    res.status(201).json({
      success: true,
      saved_at: savedJob.created,
    });
  } catch (error) {
    logger.error('Save job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /saved-jobs/:jobId
router.delete('/:jobId', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    const savedJob = await SavedJob.findOneAndDelete({
      user_id: userId,
      job_id: jobId
    });

    if (!savedJob) {
      return res.status(404).json({ error: 'Saved job not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete saved job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /saved-jobs/check?job_id=...
router.get('/check', authMiddleware, async (req, res) => {
  try {
    const { job_id } = req.query;
    const userId = req.userId;

    const savedJob = await SavedJob.findOne({
      user_id: userId,
      job_id: job_id
    });

    if (savedJob) {
      res.json({ saved: true });
    } else {
      res.status(404).json({ saved: false });
    }
  } catch (error) {
    logger.error('Check saved job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;