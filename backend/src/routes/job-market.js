import 'dotenv/config';
import express from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /job-market/analytics
router.get('/analytics', async (req, res) => {
  try {
    // Fetch all jobs
    const jobs = await pb.collection('jobs').getFullList();

    // Fetch all job applications
    const applications = await pb.collection('job_applications').getFullList();

    // Fetch all job seeker profiles for skills data
    const profiles = await pb.collection('job_seeker_profiles').getFullList();

    // 1. Calculate trending skills
    const skillsMap = new Map();
    profiles.forEach(profile => {
      if (profile.skills) {
        const skills = profile.skills.split(',').map(s => s.trim().toLowerCase());
        skills.forEach(skill => {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        });
      }
    });

    const trendingSkills = Array.from(skillsMap.entries())
      .map(([skill, count]) => ({
        skill,
        count,
        growth_percent: Math.round((count / profiles.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 2. Calculate salary trends
    const salaryTrendsMap = new Map();
    jobs.forEach(job => {
      const key = `${job.requiredExperience || 'entry'}-${job.location || 'remote'}`;
      if (!salaryTrendsMap.has(key)) {
        salaryTrendsMap.set(key, { salaries: [], count: 0 });
      }
      const data = salaryTrendsMap.get(key);
      if (job.salary) {
        data.salaries.push(job.salary);
      }
      data.count += 1;
    });

    const salaryTrends = Array.from(salaryTrendsMap.entries()).map(([key, data]) => {
      const [experienceLevel, location] = key.split('-');
      const avgSalary =
        data.salaries.length > 0
          ? Math.round(data.salaries.reduce((a, b) => a + b, 0) / data.salaries.length)
          : 0;
      return { experience_level: experienceLevel, location, avg_salary: avgSalary };
    });

    // 3. Calculate job distribution by industry
    const industryMap = new Map();
    jobs.forEach(job => {
      const industry = job.industry || 'Unknown';
      industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
    });

    const jobDistribution = Array.from(industryMap.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);

    // 4. Calculate experience demand
    const experienceMap = new Map();
    jobs.forEach(job => {
      const level = job.requiredExperience || 'entry';
      experienceMap.set(level, (experienceMap.get(level) || 0) + 1);
    });

    const experienceDemand = Array.from(experienceMap.entries()).map(([level, count]) => ({
      level,
      count,
    }));

    // 5. Calculate skills gap
    const requiredSkillsMap = new Map();
    jobs.forEach(job => {
      if (job.requiredSkills) {
        const skills = job.requiredSkills.split(',').map(s => s.trim().toLowerCase());
        skills.forEach(skill => {
          if (!requiredSkillsMap.has(skill)) {
            requiredSkillsMap.set(skill, { in_demand: 0, available: 0 });
          }
          requiredSkillsMap.get(skill).in_demand += 1;
        });
      }
    });

    // Count available talent for each skill
    profiles.forEach(profile => {
      if (profile.skills) {
        const skills = profile.skills.split(',').map(s => s.trim().toLowerCase());
        skills.forEach(skill => {
          if (requiredSkillsMap.has(skill)) {
            requiredSkillsMap.get(skill).available += 1;
          }
        });
      }
    });

    const skillsGap = Array.from(requiredSkillsMap.entries())
      .map(([skill, data]) => ({
        skill,
        in_demand_count: data.in_demand,
        available_talent_count: data.available,
      }))
      .sort((a, b) => b.in_demand_count - a.in_demand_count)
      .slice(0, 15);

    res.json({
      trending_skills: trendingSkills,
      salary_trends: salaryTrends,
      job_distribution: jobDistribution,
      experience_demand: experienceDemand,
      skills_gap: skillsGap,
    });
  } catch (error) {
    logger.error('Error fetching job market analytics:', error);
    throw error;
  }
});

export default router;