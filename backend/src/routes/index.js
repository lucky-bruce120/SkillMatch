import { Router } from 'express';
import healthCheck from './health-check.js';
import authRouter from './auth.js';
import profileRouter from './profile.js';
import jobsRouter from './jobs.js';
import employerRouter from './employer.js';
import notificationsRouter from './notifications.js';
import cvRouter from './cv.js';
import coursesRouter from './courses.js';
import jobMarketRouter from './job-market.js';
import interviewPrepRouter from './interview-prep.js';
import applyJobRouter from './apply-job.js';
import analyzeCandidateRouter from './analyze-candidates.js';
import applicationResponseRouter from './application-response.js';
import cvUploadAnalyzeRouter from './cv-upload-analyze.js';
import jobRecommendationsRouter from './job-recommendations.js';
import bookmarkedCoursesRouter from './bookmarked-courses.js';
import savedJobsRouter from './saved-jobs.js';
import adminRouter from './admin.js';
import newsRouter from './news.js';
import careerPathRouter from './career-path.js';

const router = Router();

export default () => {
  router.get('/health', healthCheck);
  router.use('/auth', authRouter);
  router.use('/profile', profileRouter);
  router.use('/jobs', jobsRouter);
  router.use('/employer', employerRouter);
  router.use('/notifications', notificationsRouter);
  router.use('/news', newsRouter);
  router.use('/cv', cvRouter);
  router.use('/courses', coursesRouter);
  router.use('/bookmarked-courses', bookmarkedCoursesRouter);
  router.use('/saved-jobs', savedJobsRouter);
  router.use('/admin', adminRouter);
  router.use('/job-market', jobMarketRouter);
  router.use('/interview-prep', interviewPrepRouter);
  router.use('/career-path', careerPathRouter);
  router.use('/job-recommendations', jobRecommendationsRouter);
  router.use('/apply-job', applyJobRouter);
  router.use('/analyze-candidate', analyzeCandidateRouter);
  router.use('/application-response', applicationResponseRouter);
  router.use('/cv-upload-analyze', cvUploadAnalyzeRouter);

  return router;
};
