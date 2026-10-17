import express from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import SavedJob from '../models/SavedJob.js';
import Notification from '../models/Notification.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import authMiddleware from '../middleware/auth.js';
import { getAnnouncements } from '../data/announcements.js';
import logger from '../utils/logger.js';

const router = express.Router();

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ helpers */

/** Shape a job for the news feed. Keeps the payload small on purpose. */
const toJobCard = (job) => ({
  id: String(job._id),
  title: job.title,
  company: job.company || 'Unknown company',
  location: job.location,
  jobType: job.jobType,
  remoteType: job.remoteType,
  experienceLevel: job.experience_level,
  skills: (job.required_skills || []).slice(0, 4),
  created: job.created,
});

/**
 * Personal items for a job seeker: their own applications, saved jobs and alerts.
 * A brand new account legitimately has none of these, which is why the platform
 * news list always carries the page on its own.
 */
const jobSeekerItems = async (userId) => {
  const [applications, savedJobs] = await Promise.all([
    Application.find({ job_seeker_id: userId })
      .sort({ applied_at: -1 })
      .limit(8)
      .populate('job_id', 'title company'),
    SavedJob.find({ user_id: userId })
      .sort({ created: -1 })
      .limit(5)
      .populate('job_id', 'title company'),
  ]);

  return [
    ...applications.map((application) => ({
      id: `application-${application._id}`,
      kind: 'application',
      title: `You applied to ${application.job_id?.title || 'a job'}`,
      meta: application.job_id?.company,
      status: application.status,
      timestamp: application.applied_at || application.updated,
      href: '/applications',
    })),
    ...savedJobs
      .filter((saved) => saved.job_id)
      .map((saved) => ({
        id: `saved-${saved._id}`,
        kind: 'saved',
        title: `You saved ${saved.job_id.title}`,
        meta: saved.job_id.company,
        timestamp: saved.created,
        href: '/saved-jobs',
      })),
  ];
};

/** Every user gets their own alerts, whichever role they signed up with. */
const notificationItems = async (userId) => {
  const notifications = await Notification.find({ user_id: userId }).sort({ created: -1 }).limit(6);

  return notifications.map((notification) => ({
    id: `notification-${notification._id}`,
    kind: 'notification',
    title: notification.title || 'Notification',
    meta: notification.message,
    unread: !notification.isRead,
    timestamp: notification.created,
    href: '/notifications',
  }));
};

/** Personal items for an employer: applicants on their roles + their own posts. */
const employerItems = async (userId) => {
  const jobIds = await Job.find({ employer_id: userId }, '_id').then((jobs) => jobs.map((job) => job._id));

  const [applications, ownJobs] = await Promise.all([
    jobIds.length
      ? Application.find({ job_id: { $in: jobIds } })
          .sort({ applied_at: -1 })
          .limit(8)
          .populate('job_seeker_id', 'email')
          .populate('job_id', 'title company')
      : [],
    Job.find({ employer_id: userId }).sort({ created: -1 }).limit(5),
  ]);

  // `job_seeker_id` points at the User, so resolve the readable name from the
  // candidate's profile instead of falling back to their email address.
  const seekerIds = applications
    .map((application) => application.job_seeker_id?._id)
    .filter(Boolean);

  const nameByUserId = new Map();
  if (seekerIds.length) {
    const profiles = await JobSeekerProfile.find({ user_id: { $in: seekerIds } }).select(
      'user_id full_name firstName lastName',
    );
    profiles.forEach((profile) => {
      const name = profile.full_name || [profile.firstName, profile.lastName].filter(Boolean).join(' ');
      if (name) nameByUserId.set(String(profile.user_id), name);
    });
  }

  return [
    ...applications.map((application) => {
      const applicant = application.job_seeker_id;
      const name =
        (applicant && nameByUserId.get(String(applicant._id))) || applicant?.email || 'A candidate';

      return {
        id: `application-${application._id}`,
        kind: 'applicant',
        title: `${name} applied to ${application.job_id?.title || 'your job'}`,
        meta: application.job_id?.company,
        status: application.status,
        timestamp: application.applied_at || application.updated,
        href: '/employer/applications',
      };
    }),
    ...ownJobs.map((job) => ({
      id: `job-${job._id}`,
      kind: 'job',
      title: `You posted ${job.title}`,
      meta: job.company || job.location,
      status: job.status,
      timestamp: job.created,
      href: '/employer/jobs',
    })),
  ];
};

/** Personal items for an admin: the newest jobs and newest sign-ups. */
const adminItems = async () => {
  const [jobs, users] = await Promise.all([
    Job.find().sort({ created: -1 }).limit(6),
    User.find().sort({ created: -1 }).limit(6).select('email role account_status created'),
  ]);

  return [
    ...jobs.map((job) => ({
      id: `job-${job._id}`,
      kind: 'job',
      title: `${job.title} posted at ${job.company || 'an unnamed company'}`,
      meta: job.location,
      status: job.status,
      timestamp: job.created,
      href: '/admin/jobs',
    })),
    ...users.map((user) => ({
      id: `user-${user._id}`,
      kind: 'user',
      title: `${user.email} signed up as ${String(user.role).replace(/_/g, ' ')}`,
      meta: user.account_status,
      status: user.account_status,
      timestamp: user.created,
      href: '/admin/users',
    })),
  ];
};

/* ------------------------------------------------------------------- routes */

/**
 * GET /news/feed
 *
 * Everything the signed-in home page needs in a single round trip:
 *  - `platform`  live counters + trending skills + latest jobs (market news)
 *  - `news`      date-stamped headlines generated from that live data
 *  - `personal`  the signed-in user's own recent activity
 *  - `stats`     role-aware counters for the summary cards
 *  - `announcements` evergreen platform updates
 */
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId, 'role');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { role } = user;
    const weekAgo = new Date(Date.now() - ONE_WEEK);

    const [
      totalJobs,
      jobsThisWeek,
      totalApplications,
      applicationsThisWeek,
      latestJobs,
      trendingSkills,
    ] = await Promise.all([
      Job.countDocuments({ status: 'active' }),
      Job.countDocuments({ status: 'active', created: { $gte: weekAgo } }),
      Application.countDocuments(),
      Application.countDocuments({ applied_at: { $gte: weekAgo } }),
      Job.find({ status: 'active' }).sort({ created: -1 }).limit(6),
      Job.aggregate([
        { $match: { status: 'active', required_skills: { $exists: true, $ne: [] } } },
        { $unwind: '$required_skills' },
        { $group: { _id: '$required_skills', openings: { $sum: 1 } } },
        { $sort: { openings: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const latestJobCards = latestJobs.map(toJobCard);

    // Date-stamped headlines derived from the live data above.
    const news = [];

    if (jobsThisWeek > 0) {
      news.push({
        id: 'news-jobs-week',
        kind: 'job',
        title: `${jobsThisWeek} new job${jobsThisWeek === 1 ? '' : 's'} posted this week`,
        meta: 'Fresh openings across the platform, newest first.',
        timestamp: latestJobCards[0]?.created || weekAgo,
        href: '/jobs',
      });
    }

    latestJobCards.slice(0, 3).forEach((job) => {
      news.push({
        id: `news-job-${job.id}`,
        kind: 'job',
        title: `${job.company} is hiring: ${job.title}`,
        meta: [job.location, job.remoteType, job.jobType].filter(Boolean).join(' · '),
        timestamp: job.created,
        href: `/job/${job.id}`,
      });
    });

    const [topSkill] = trendingSkills;
    if (topSkill) {
      news.push({
        id: 'news-trending-skill',
        kind: 'chart',
        title: `${topSkill._id} is the most requested skill right now`,
        meta: `It appears in ${topSkill.openings} open role${topSkill.openings === 1 ? '' : 's'}. Add it to your profile to appear in more matches.`,
        timestamp: latestJobCards[0]?.created || weekAgo,
        href: '/job-market-analytics',
      });
    }

    if (applicationsThisWeek > 0) {
      news.push({
        id: 'news-applications-week',
        kind: 'activity',
        title: `${applicationsThisWeek} application${applicationsThisWeek === 1 ? '' : 's'} submitted this week`,
        meta: 'Employers on SkillMatch are actively reviewing profiles.',
        timestamp: weekAgo,
        href: '/job-market-analytics',
      });
    }

    let personal = [];
    let stats = {};
    let viewer = { name: null, detail: null };

    const alertsPromise = notificationItems(req.userId);

    if (role === 'job_seeker') {
      const [profile, applicationCount, savedCount, unreadCount, items, alerts] = await Promise.all([
        // NB: skills live in `skillDetails` — the raw `skills` array is never
        // written to, so counting it would always report zero.
        JobSeekerProfile.findOne({ user_id: req.userId }).select('full_name firstName lastName skillDetails cv location'),
        Application.countDocuments({ job_seeker_id: req.userId }),
        SavedJob.countDocuments({ user_id: req.userId }),
        Notification.countDocuments({ user_id: req.userId, isRead: false }),
        jobSeekerItems(req.userId),
        alertsPromise,
      ]);

      personal = [...items, ...alerts];
      viewer = {
        name: profile?.full_name || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || null,
        detail: profile?.location || null,
      };
      stats = {
        Applications: applicationCount,
        'Saved jobs': savedCount,
        'Unread alerts': unreadCount,
        // Skill count is a useful nudge for brand new accounts.
        'Skills on profile': profile?.skillDetails?.length || 0,
      };
    } else if (role === 'employer') {
      const [jobIds, employerProfile] = await Promise.all([
        Job.find({ employer_id: req.userId }, '_id').then((jobs) => jobs.map((job) => job._id)),
        EmployerProfile.findOne({ user_id: req.userId }).select('company_name'),
      ]);

      const [jobCount, applicationCount, acceptedCount, unreadCount, items, alerts] = await Promise.all([
        Job.countDocuments({ employer_id: req.userId }),
        jobIds.length ? Application.countDocuments({ job_id: { $in: jobIds } }) : Promise.resolve(0),
        jobIds.length ? Application.countDocuments({ job_id: { $in: jobIds }, status: 'accepted' }) : Promise.resolve(0),
        Notification.countDocuments({ user_id: req.userId, isRead: false }),
        employerItems(req.userId),
        alertsPromise,
      ]);

      personal = [...items, ...alerts];
      viewer = { name: employerProfile?.company_name || null, detail: null };
      stats = {
        'Posted jobs': jobCount,
        Applicants: applicationCount,
        Interviews: acceptedCount,
        'Unread alerts': unreadCount,
      };
    } else if (role === 'admin') {
      const [userCount, jobCount, applicationCount, items, alerts] = await Promise.all([
        User.countDocuments(),
        Job.countDocuments(),
        Application.countDocuments(),
        adminItems(),
        alertsPromise,
      ]);

      personal = [...items, ...alerts];
      stats = {
        Users: userCount,
        Jobs: jobCount,
        Applications: applicationCount,
        'New this week': jobsThisWeek,
      };
    }

    // Newest first, and drop anything without a usable timestamp.
    personal.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    res.json({
      generatedAt: new Date(),
      platform: {
        totalJobs,
        jobsThisWeek,
        totalApplications,
        applicationsThisWeek,
        trendingSkills: trendingSkills.map((entry) => ({
          skill: entry._id,
          openings: entry.openings,
        })),
        latestJobs: latestJobCards,
      },
      news,
      personal,
      stats,
      viewer,
      announcements: getAnnouncements(role),
    });
  } catch (error) {
    logger.error('News feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
