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

    // Update application with new status and feedback
    application.status = status;
    if (feedback) {
      application.feedback = feedback;
    }
    await application.save();

    // Get job seeker info
    const jobSeeker = await JobSeekerProfile.findById(application.job_seeker_id);
    if (!jobSeeker) {
      return res.status(404).json({ error: 'Job seeker profile not found' });
    }

    // Get user info to find user_id for notification
    const user = await User.findById(jobSeeker.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get job info for notification message
    const job = await Job.findById(application.job_id);
    const jobTitle = job ? job.title : 'a job';

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