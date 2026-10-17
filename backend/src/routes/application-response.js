import 'dotenv/config';
import express from 'express';
import Application from '../models/Application.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// PUT /application-response
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { applicationId, status, feedback } = req.body;

    if (!applicationId || !status) {
      return res.status(400).json({ error: 'applicationId and status are required' });
    }

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, reviewed, accepted, or rejected' });
    }

    // Retrieve application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Only the employer who posted the job may change its application status.
    // Without this check any authenticated user could rewrite the outcome of
    // any application by guessing its id, and trigger a notification to the
    // candidate. `employer/applications/:id/status` already enforces this.
    const job = await Job.findById(application.job_id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id.toString() !== req.userId) {
      return res.status(403).json({ error: 'You are not allowed to update this application' });
    }

    // Update application with new status and feedback
    application.status = status;
    if (feedback) {
      application.feedback = feedback;
    }
    await application.save();

    // Get job seeker info.
    // Note: application.job_seeker_id references User, so the profile is
    // looked up by its user_id rather than by its own _id.
    const jobSeeker = await JobSeekerProfile.findOne({ user_id: application.job_seeker_id });
    if (!jobSeeker) {
      return res.status(404).json({ error: 'Job seeker profile not found' });
    }

    // Get user info to confirm the account still exists
    const user = await User.findById(jobSeeker.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const jobTitle = job.title || 'a job';

    // Create notification for job seeker
    const notificationMessages = {
      reviewed: `Your application for ${jobTitle} has been reviewed!`,
      accepted: `Congratulations! Your application for ${jobTitle} has been accepted!`,
      rejected: `Your application for ${jobTitle} has been reviewed.`,
    };

    const notification = new Notification({
      user_id: user._id,
      type: 'application_response',
      title: `Application ${status}`,
      message: notificationMessages[status] || `Your application status has been updated to ${status}`,
      related_id: application._id,
      isRead: false,
    });
    await notification.save();

    res.json({
      success: true,
      error: null,
    });
  } catch (error) {
    logger.error('Application response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;