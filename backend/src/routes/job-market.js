import express from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import JobSeekerProfile from '../models/JobSeekerProfile.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/analytics', async (req, res) => {
  try {
    const [jobs, applications, profiles] = await Promise.all([
      Job.find(),
      Application.find(),
      JobSeekerProfile.find(),
    ]);

    const skillDemand = new Map();
    const skillSupply = new Map();

    jobs.forEach((job) => {
      (job.required_skills || []).forEach((skill) => {
        const key = String(skill).trim().toLowerCase();
        if (!key) return;
        skillDemand.set(key, (skillDemand.get(key) || 0) + 1);
      });
    });

    profiles.forEach((profile) => {
      const skills = [
        ...(profile.skills || []),
        ...((profile.skillDetails || []).map((skill) => skill.skill_name)),
      ];

      skills.forEach((skill) => {
        const key = String(skill).trim().toLowerCase();
        if (!key) return;
        skillSupply.set(key, (skillSupply.get(key) || 0) + 1);
      });
    });

    const trending_skills = Array.from(skillDemand.entries())
      .map(([skill, count]) => ({
        skill,
        count,
        growth_percent: profiles.length ? Math.round((count / profiles.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const salary_trends = ['entry', 'mid', 'senior', 'executive'].map((level) => {
      const matchingJobs = jobs.filter((job) => job.experience_level === level);
      const salaries = matchingJobs
        .map((job) => job.salary_max || job.salary_min || job.salary)
        .filter(Boolean);

      return {
        experience_level: level,
        avg_salary: salaries.length
          ? Math.round(salaries.reduce((sum, value) => sum + value, 0) / salaries.length)
          : 0,
      };
    });

    const job_distribution = Array.from(
      jobs.reduce((map, job) => {
        const key = job.company || 'Unknown';
        map.set(key, (map.get(key) || 0) + 1);
        return map;
      }, new Map()).entries()
    )
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const skills_gap = Array.from(skillDemand.entries())
      .map(([skill, inDemand]) => ({
        skill,
        in_demand_count: inDemand,
        available_talent_count: skillSupply.get(skill) || 0,
      }))
      .sort((a, b) => b.in_demand_count - a.in_demand_count)
      .slice(0, 15);

    res.json({
      trending_skills,
      salary_trends,
      job_distribution,
      experience_demand: [
        { level: 'entry', count: jobs.filter((job) => job.experience_level === 'entry').length },
        { level: 'mid', count: jobs.filter((job) => job.experience_level === 'mid').length },
        { level: 'senior', count: jobs.filter((job) => job.experience_level === 'senior').length },
        { level: 'executive', count: jobs.filter((job) => job.experience_level === 'executive').length },
      ],
      skills_gap,
      applications_count: applications.length,
    });
  } catch (error) {
    logger.error('Error fetching job market analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
