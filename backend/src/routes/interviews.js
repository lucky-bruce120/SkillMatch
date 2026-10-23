import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';
import Interview from '../models/Interview.js';
import Application from '../models/Application.js';
import { createNotification } from '../utils/createNotification.js';
import { emitToUser } from '../utils/eventBus.js';

const router = express.Router();

// Create interview invitation
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      applicationId,
      title,
      description,
      date,
      time,
      duration_minutes,
      type,
      location,
      meeting_link,
    } = req.body;

    const employerId = req.userId;

    if (!applicationId || !title || !date) {
      return res.status(400).json({ error: 'applicationId, title, and date are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ error: 'Invalid applicationId' });
    }

    const application = await Application.findById(applicationId)
      .populate('job_id')
      .populate('job_seeker_id');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!application.job_id) {
      return res.status(404).json({ error: 'Job not found for this application' });
    }

    // Verify employer owns the job
    if (application.job_id.employer_id.toString() !== employerId) {
      return res.status(403).json({ error: 'You do not have permission to invite for this application' });
    }

    const interviewDate = time ? new Date(`${date}T${time}`) : new Date(date);

    if (isNaN(interviewDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    const interview = new Interview({
      application_id: application._id,
      job_id: application.job_id._id,
      employer_id: employerId,
      job_seeker_id: application.job_seeker_id._id,
      title,
      description: description || '',
      type: type || 'video',
      date: interviewDate,
      duration_minutes: duration_minutes || 30,
      location: location || '',
      meeting_link: meeting_link || '',
      status: 'sent',
      sent_at: new Date(),
    });

    await interview.save();

    // Create notification for job seeker
    try {
      const message = `You have been invited to interview for "${application.job_id.title}" on ${interviewDate.toLocaleString()}.`;

      await createNotification({
        user_id: application.job_seeker_id._id,
        type: 'application_response',
        title: 'Interview Invitation',
        message,
        related_id: interview._id,
      });

      // Live update so the candidate sees the invitation right away.
      emitToUser(application.job_seeker_id._id, 'interview:invited', {
        interviewId: interview._id,
        applicationId: application._id,
        jobId: application.job_id._id,
        jobTitle: application.job_id.title,
        title: interview.title,
        date: interview.date,
        message,
      });
    } catch (notifErr) {
      logger.error('Error creating interview invitation notification:', notifErr);
    }

    await interview.populate(['application_id', 'job_id', 'job_seeker_id', 'employer_id']);

    res.status(201).json({
      success: true,
      interview,
    });
  } catch (error) {
    logger.error('Create interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interviews for employer
router.get('/employer', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;
    const interviews = await Interview.find({ employer_id: employerId })
      .sort({ date: -1 })
      .populate('application_id', 'status cover_letter')
      .populate('job_id', 'title company')
      .populate('job_seeker_id', 'email');
    res.json(interviews);
  } catch (error) {
    logger.error('Get employer interviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interviews for job seeker
router.get('/seeker', authMiddleware, async (req, res) => {
  try {
    const jobSeekerId = req.userId;
    const interviews = await Interview.find({ job_seeker_id: jobSeekerId })
      .sort({ date: -1 })
      .populate('application_id', 'status')
      .populate('job_id', 'title company')
      .populate('employer_id', 'email');
    res.json(interviews);
  } catch (error) {
    logger.error('Get seeker interviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update interview
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const interviewId = req.params.id;
    const { status, feedback } = req.body;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ error: 'Invalid interview id' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Only employer or involved party can update
    const userId = req.userId;
    const isOwner = interview.employer_id.toString() === userId || interview.job_seeker_id.toString() === userId;

    if (!isOwner) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (status) {
      interview.status = status;
    }
    if (feedback) {
      interview.feedback = feedback;
    }

    await interview.save();
    res.json({ success: true, interview });
  } catch (error) {
    logger.error('Update interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
