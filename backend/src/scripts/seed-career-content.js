/**
 * Seeds the static reference content the career tools depend on.
 *
 * Courses, interview questions and interview tips are not user-generated, so
 * without this the recommendation, practice and resources pages are all empty.
 * Safe to re-run: existing documents are upserted by title/question rather than
 * duplicated.
 *
 *   npm run seed:content
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../utils/database.js';
import Course from '../models/Course.js';
import InterviewQuestion from '../models/InterviewQuestion.js';
import InterviewTip from '../models/InterviewTip.js';

/* ------------------------------------------------------------------- courses */

const COURSES = [
  // --- Programming ---
  {
    title: 'JavaScript: The Definitive Guide',
    description: 'Covers the whole language including closures, prototypes, async patterns and the event loop.',
    category: 'Programming',
    difficulty_level: 'advanced',
    provider: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
    duration: '40h',
    rating: 4.7,
    skills: ['JavaScript', 'Algorithms', 'Data Structures'],
  },
  {
    title: 'React - The Complete Guide',
    description: 'Component design, hooks, state management and performance from first principles.',
    category: 'Programming',
    difficulty_level: 'intermediate',
    provider: 'Udemy',
    url: 'https://www.udemy.com/course/the-complete-react-developer-course/',
    duration: '40h',
    rating: 4.7,
    skills: ['React', 'JavaScript', 'Frontend', 'Hooks'],
  },
  {
    title: 'Node.js and Express Bootcamp',
    description: 'Build REST APIs with Node, Express and MongoDB, including auth and deployment.',
    category: 'Programming',
    difficulty_level: 'intermediate',
    provider: 'Udemy',
    url: 'https://www.udemy.com/course/the-web-developer-bootcamp/',
    duration: '48h',
    rating: 4.5,
    skills: ['Node.js', 'Express', 'MongoDB', 'REST API'],
  },
  {
    title: 'Python for Everybody',
    description: 'Beginner-friendly Python covering variables, functions, files and web scraping.',
    category: 'Programming',
    difficulty_level: 'beginner',
    provider: 'Coursera',
    url: 'https://www.coursera.org/learn/python',
    duration: '45h',
    rating: 4.8,
    skills: ['Python', 'Scripting'],
  },
  {
    title: 'Git and GitHub Bootcamp',
    description: 'Version control from first commit to branching strategies and pull request workflow.',
    category: 'Programming',
    difficulty_level: 'beginner',
    provider: 'Udemy',
    url: 'https://www.udemy.com/course/git-and-github-bootcamp/',
    duration: '9h',
    rating: 4.6,
    skills: ['Git', 'GitHub', 'Version Control'],
  },
  {
    title: 'Docker and Kubernetes Practical Guide',
    description: 'Containerise applications, then deploy and scale them with Kubernetes.',
    category: 'Programming',
    difficulty_level: 'advanced',
    provider: 'Udemy',
    url: 'https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/',
    duration: '14h',
    rating: 4.6,
    skills: ['Docker', 'Kubernetes', 'DevOps', 'Containers'],
  },
  {
    title: 'System Design Interview Course',
    description: 'Scalability, load balancing, caching and database design, worked through with real cases.',
    category: 'Programming',
    difficulty_level: 'advanced',
    provider: 'Educative',
    url: 'https://www.educative.io/paths/system-design',
    duration: '25h',
    rating: 4.7,
    skills: ['System Design', 'Scalability', 'Architecture'],
  },
  {
    title: 'TypeScript Masterclass',
    description: 'Type system, generics, narrowing and patterns for large TypeScript codebases.',
    category: 'Programming',
    difficulty_level: 'intermediate',
    provider: 'Udemy',
    url: 'https://www.udemy.com/course/typescript-masterclass/',
    duration: '10h',
    rating: 4.6,
    skills: ['TypeScript', 'JavaScript'],
  },

  // --- Data ---
  {
    title: 'SQL for Data Analysis',
    description: 'Joins, window functions, CTEs and query tuning against realistic datasets.',
    category: 'Data Science',
    difficulty_level: 'beginner',
    provider: 'Mode Tutorials',
    url: 'https://mode.com/sql-tutorial/',
    duration: '12h',
    rating: 4.8,
    skills: ['SQL', 'Data Analysis', 'Databases'],
  },
  {
    title: 'Machine Learning Specialization',
    description: 'Supervised learning, neural networks and practical model evaluation.',
    category: 'Data Science',
    difficulty_level: 'intermediate',
    provider: 'Coursera',
    url: 'https://www.coursera.org/specializations/machine-learning-introduction',
    duration: '100h',
    rating: 4.8,
    skills: ['Machine Learning', 'Python', 'Statistics'],
  },
  {
    title: 'Data Science with Python',
    description: 'Pandas, NumPy, Matplotlib and statistical analysis end to end.',
    category: 'Data Science',
    difficulty_level: 'intermediate',
    provider: 'Coursera',
    url: 'https://www.coursera.org/specializations/data-science-python',
    duration: '95h',
    rating: 4.6,
    skills: ['Python', 'Pandas', 'Data Visualisation', 'Statistics'],
  },
  {
    title: 'Power BI for Business Analytics',
    description: 'Build dashboards and reports, and model data for reporting use.',
    category: 'Data Science',
    difficulty_level: 'beginner',
    provider: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/en-us/training/powerbi/',
    duration: '15h',
    rating: 4.5,
    skills: ['Power BI', 'Data Visualisation', 'Business Intelligence'],
  },
  {
    title: 'Tableau Desktop Specialist',
    description: 'Visual analysis, dashboards and storytelling with data in Tableau.',
    category: 'Data Science',
    difficulty_level: 'beginner',
    provider: 'Tableau',
    url: 'https://www.tableau.com/learn/training',
    duration: '20h',
    rating: 4.4,
    skills: ['Tableau', 'Data Visualisation'],
  },

  // --- Design ---
  {
    title: 'UX Design Fundamentals',
    description: 'User research, wireframing, prototyping and usability testing.',
    category: 'Design',
    difficulty_level: 'beginner',
    provider: 'Coursera',
    url: 'https://www.coursera.org/specializations/ux-design',
    duration: '120h',
    rating: 4.7,
    skills: ['UX Design', 'User Research', 'Prototyping', 'Figma'],
  },
  {
    title: 'Design Systems with Figma',
    description: 'Build reusable components, tokens and documentation for a design system.',
    category: 'Design',
    difficulty_level: 'intermediate',
    provider: 'Figma',
    url: 'https://www.figma.com/resource-library/design-systems-101/',
    duration: '10h',
    rating: 4.5,
    skills: ['Figma', 'Design Systems', 'UI Design'],
  },

  // --- Product ---
  {
    title: 'Product Management Foundations',
    description: 'Discovery, prioritisation frameworks, roadmaps and stakeholder management.',
    category: 'Business',
    difficulty_level: 'beginner',
    provider: 'Product School',
    url: 'https://www.productschool.com/certified-product-manager',
    duration: '30h',
    rating: 4.4,
    skills: ['Product Management', 'Roadmapping', 'Stakeholder Management'],
  },
  {
    title: 'Agile and Scrum Mastery',
    description: 'Scrum ceremonies, backlog refinement and running effective sprints.',
    category: 'Business',
    difficulty_level: 'intermediate',
    provider: 'Scrum.org',
    url: 'https://www.scrum.org/resources/courses',
    duration: '14h',
    rating: 4.5,
    skills: ['Scrum', 'Agile', 'Project Management'],
  },
  {
    title: 'Stakeholder Communication',
    description: 'Influence without authority, writing updates and running effective reviews.',
    category: 'Business',
    difficulty_level: 'intermediate',
    provider: 'Coursera',
    url: 'https://www.coursera.org/learn/leadership-management',
    duration: '18h',
    rating: 4.3,
    skills: ['Communication', 'Leadership', 'Stakeholder Management'],
  },

  // --- Certification-adjacent, genuinely useful ---
  {
    title: 'AWS Certified Developer Associate',
    description: 'Deployment, IAM, Lambda, S3 and CI/CD on AWS, with practice exams.',
    category: 'Certification',
    difficulty_level: 'advanced',
    provider: 'A Cloud Guru',
    url: 'https://www.pluralsight.com/paths/aws-certified-developer-associate',
    duration: '35h',
    rating: 4.5,
    skills: ['AWS', 'Cloud', 'Lambda', 'DevOps'],
  },
  {
    title: 'Google Data Analytics Certificate',
    description: 'Full analytics pathway: tools, data preparation, analysis and storytelling.',
    category: 'Certification',
    difficulty_level: 'beginner',
    provider: 'Coursera',
    url: 'https://www.coursera.org/professional-certificates/google-data-analytics',
    duration: '130h',
    rating: 4.8,
    skills: ['Data Analysis', 'SQL', 'Data Visualisation', 'R'],
  },
  {
    title: 'Meta Front-End Developer Certificate',
    description: 'React, UX principles and web application development with graded projects.',
    category: 'Certification',
    difficulty_level: 'intermediate',
    provider: 'Coursera',
    url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer',
    duration: '90h',
    rating: 4.7,
    skills: ['React', 'JavaScript', 'UX Design', 'Frontend'],
  },
  {
    title: 'Professional in Human Resources: SHRM-CP',
    description: 'Recruitment, employee relations and US HR law fundamentals.',
    category: 'Business',
    difficulty_level: 'intermediate',
    provider: 'SHRM',
    url: 'https://www.shrm.org/certification/hrs-cp',
    duration: '90h',
    rating: 4.4,
    skills: ['Human Resources', 'Recruiting', 'Employee Relations'],
  },
  {
    title: 'Digital Marketing - SEO and Content',
    description: 'Keyword research, on-page SEO, content strategy and measurement.',
    category: 'Business',
    difficulty_level: 'beginner',
    provider: 'Coursera',
    url: 'https://www.coursera.org/specializations/digital-marketing',
    duration: '70h',
    rating: 4.6,
    skills: ['SEO', 'Content Marketing', 'Digital Marketing'],
  },
];

/* ----------------------------------------------------- interview questions */

const QUESTIONS = [
  // Software Engineer
  { role: 'Software Engineer', difficulty: 'Medium', question: 'Tell me about a time you had to debug a production incident. What did you do?', answer: 'Use STAR. Situation: name the incident, its blast radius and the pressure. Task: what you specifically owned. Action: how you narrowed it down, what you read, who you pulled in. Result: the outage resolved, plus the change you made so it could not recur.' },
  { role: 'Software Engineer', difficulty: 'Medium', question: 'How do you approach a feature request with an unclear specification?', answer: 'Describe writing it down, listing the open questions, identifying the riskiest assumption, and proposing the smallest slice that tests it. Mention how you kept the requester involved while you clarified.' },
  { role: 'Software Engineer', difficulty: 'Hard', question: 'Walk me through how you would design a rate limiter for a public API.', answer: 'Start with the algorithm (token bucket or sliding window) and the store (Redis with atomic increment and expiry). Cover keys per user or IP, the failure mode when Redis is down, and how you would expose the headers.' },
  { role: 'Software Engineer', difficulty: 'Easy', question: 'What does the keyword "const" actually guarantee in JavaScript?', answer: 'It guarantees the binding is not reassigned, not that the value is immutable. Walk through mutation of an object or array held in a const, then contrast with Object.freeze.' },
  { role: 'Software Engineer', difficulty: 'Medium', question: 'Tell me about a technical decision you disagreed with. How did you handle it?', answer: 'Show you argued with evidence, committed to the decision once made, and stayed constructive afterwards. Avoid the "I was right all along" framing.' },

  // Data Scientist
  { role: 'Data Scientist', difficulty: 'Medium', question: 'A model performs well in testing but badly in production. How do you investigate?', answer: 'Cover train/serve skew, data drift, leakage in the validation split, and distribution shift. Mention how you would build a monitoring dashboard for feature drift and model metrics over time.' },
  { role: 'Data Scientist', difficulty: 'Hard', question: 'How would you design an experiment to test a new pricing page?', answer: 'Cover hypothesis and primary metric, randomisation unit, sample size and power, guardrail metrics such as refund rate, and how you would handle novelty effects and seasonality.' },
  { role: 'Data Scientist', difficulty: 'Medium', question: 'Explain the difference between precision and recall, and when each matters more.', answer: 'Define both with counts, give a concrete example of each, and say that recall matters when missing a positive is costly (fraud, disease screening) while precision matters when a false positive is costly (spam filters).' },

  // Data Analyst
  { role: 'Data Analyst', difficulty: 'Easy', question: 'What is the difference between a JOIN and a LEFT JOIN?', answer: 'An inner join returns only rows that match on both sides; a left join keeps every row from the left table and fills unmatched right-hand columns with NULL. Mention that using a left join changes the row count if the right side is not unique.' },
  { role: 'Data Analyst', difficulty: 'Medium', question: 'You are asked for a metric and the stakeholder disagrees with the number. What do you do?', answer: 'Show you reproduce it, walk the definition, check for filter or time-zone differences, and agree a written metric definition. Avoid defending the number before understanding theirs.' },

  // Product Manager
  { role: 'Product Manager', difficulty: 'Medium', question: 'Tell me about a product decision you made with incomplete data.', answer: 'Describe naming the decision, the reversible and irreversible parts, what signal you would use to be wrong, and how you set a checkpoint to revisit.' },
  { role: 'Product Manager', difficulty: 'Hard', question: 'How do you prioritise when engineering capacity is half what is requested?', answer: 'Walk through impact versus effort, how you split requests into must-have slices, and how you communicate the trade-off and what will not be built.' },
  { role: 'Product Manager', difficulty: 'Medium', question: 'A key metric dropped overnight. How do you respond?', answer: 'Describe checking whether it is real or a tracking bug, identifying the affected segment, and the order of operations: confirm, mitigate, then diagnose.' },

  // UX Designer
  { role: 'UX Designer', difficulty: 'Medium', question: 'Walk me through a design decision you reversed after user testing.', answer: 'Show what you tested, what the evidence said, that you dropped your original solution, and what you shipped instead. Interviewers look for evidence of letting data win.' },
  { role: 'UX Designer', difficulty: 'Easy', question: 'What is the difference between usability and accessibility?', answer: 'Usability is whether a user can complete the task efficiently; accessibility is whether people with disabilities can perceive, operate and understand it. Give one example where a design passes one and fails the other.' },

  // Marketing
  { role: 'Marketing', difficulty: 'Medium', question: 'How do you measure whether a campaign worked?', answer: 'Cover setting a baseline first, choosing one primary metric, separating correlation from causation, and using incrementality or holdout tests where possible.' },
  { role: 'Marketing', difficulty: 'Easy', question: 'Tell me about a campaign that underperformed. What did you change afterwards?', answer: 'Be specific about the hypothesis that was wrong, the data that showed it, and the change you made next time. Avoid blaming the algorithm.' },

  // Frontend Engineer
  { role: 'Frontend Engineer', difficulty: 'Medium', question: 'How do you decide what to render on the server versus the client?', answer: 'Talk about initial paint, SEO and share previews, bundle size, and what the data actually needs. Mention hydration cost when you choose server rendering.' },
  { role: 'Frontend Engineer', difficulty: 'Hard', question: 'A page feels janky when scrolling. How do you diagnose it?', answer: 'Describe using the performance panel to find long tasks, checking layout thrash, profiling paint, and the usual fixes: virtualise long lists, debounce handlers, avoid forced synchronous layout.' },

  // Backend Engineer
  { role: 'Backend Engineer', difficulty: 'Medium', question: 'How do you handle database migrations on a live system?', answer: 'Cover making migrations backwards compatible, adding the column before the code that uses it, deploying in expand/migrate/contract order, and having a tested rollback.' },
  { role: 'Backend Engineer', difficulty: 'Hard', question: 'Design the API for a short URL service.', answer: 'Cover the POST to create and GET to resolve, key generation with collision handling, the storage model, caching on the hot read path, and expiry.' },

  // DevOps Engineer
  { role: 'DevOps Engineer', difficulty: 'Medium', question: 'How do you keep deployments safe?', answer: 'Describe CI gates, canary or blue-green rollouts, automated rollback on error-rate thresholds, and how you make the pipeline fast enough that people use it.' },
  { role: 'DevOps Engineer', difficulty: 'Hard', question: 'Your service is intermittently slow under load. How do you investigate?', answer: 'Cover p50 versus p99 latency, checking for N+1 queries and lock contention, examining connection pool saturation, and how you load test to reproduce.' },

  // Project Manager
  { role: 'Project Manager', difficulty: 'Medium', question: 'A key dependency is late. How do you handle it?', answer: 'Describe quantifying the schedule impact, identifying the critical path, then escalating with options and a recommendation rather than just reporting the problem.' },
];

/* ---------------------------------------------------------- interview tips */

const TIPS = [
  { role: 'Software Engineer', category: 'Technical', text: 'Think out loud. A structured verbal walkthrough of your reasoning scores better than a correct answer you deliver silently.' },
  { role: 'Software Engineer', category: 'Technical', text: 'Clarify requirements before coding. Asking about scale, consistency or latency is scored as a positive signal, not as hesitation.' },
  { role: 'Software Engineer', category: 'Behavioural', text: 'Quantify the result of every story. A number you invented is worse than an honest "I do not have the figure, but it cut review time noticeably".' },
  { role: 'Software Engineer', category: 'Preparation', text: 'Have a real project open in your editor before the call. Being able to share your screen and show working code changes the conversation.' },
  { role: 'Software Engineer', category: 'Common Mistake', text: 'Do not describe the team effort as yours. Interviewers probe specifically for your individual contribution.' },

  { role: 'Data Scientist', category: 'Technical', text: 'State your assumptions about the data before modelling. Interviewers want to see you interrogate data quality, not just fit a model.' },
  { role: 'Data Scientist', category: 'Technical', text: 'Always mention how you would validate the result, not just how you built it. A metric without an evaluation plan is an incomplete answer.' },
  { role: 'Data Scientist', category: 'Common Mistake', text: 'Avoid quoting a metric without a baseline. Always frame a change relative to something.' },
  { role: 'Data Scientist', category: 'Preparation', text: 'Prepare one project you can describe end to end, including what did not work. Knowing your failures is a strong signal.' },

  { role: 'Data Analyst', category: 'Technical', text: 'Clarify the grain of the data first. Saying "is this per user or per session?" immediately signals rigour.' },
  { role: 'Data Analyst', category: 'Technical', text: 'Prefer window functions over self-joins when explaining row-level analysis. It reads as professional SQL.' },
  { role: 'Data Analyst', category: 'Stakeholder', text: 'When a stakeholder disputes a number, restate their definition back to them before defending yours. Most disagreements are definitional.' },
  { role: 'Data Analyst', category: 'Preparation', text: 'Bring two dashboards you built and be ready to explain the decisions behind what you chose not to chart.' },

  { role: 'Product Manager', category: 'Discovery', text: 'Frame every answer as a hypothesis with a success metric. It shows product thinking rather than feature enthusiasm.' },
  { role: 'Product Manager', category: 'Prioritisation', text: 'Name the framework you are using (RICE, Kano, ICE) and explain why it fits this decision rather than reciting the formula.' },
  { role: 'Product Manager', category: 'Stakeholder', text: 'Practise saying no with an alternative. "Not this quarter, here is what I will do instead" lands far better than a flat no.' },
  { role: 'Product Manager', category: 'Common Mistake', text: 'Do not start with the solution in a discovery question. Walk through what you would need to learn first.' },
  { role: 'Product Manager', category: 'Preparation', text: 'Know the company\'s actual business model and its main metric before you walk in. It is the cheapest signal you can send.' },

  { role: 'UX Designer', category: 'Process', text: 'Always explain why a research method fits the question. "Five interviews" only works if the question is about behaviour and attitudes.' },
  { role: 'UX Designer', category: 'Portfolio', text: 'Present one project in full depth rather than five superficially. Depth shows how you actually think.' },
  { role: 'UX Designer', category: 'Portfolio', text: 'Have the actual artefact ready. Sharing a live Figma file beats pasting screenshots.' },
  { role: 'UX Designer', category: 'Common Mistake', text: 'Do not present work you did not personally do without saying so. Interviewers ask pointed questions about process.' },

  { role: 'Marketing', category: 'Measurement', text: 'Lead with how you would test incrementality. Anyone can quote a correlation; proving causation is what separates you.' },
  { role: 'Marketing', category: 'Preparation', text: 'Know your campaign\'s funnel definition cold, including what counts as a conversion.' },
  { role: 'Marketing', category: 'Common Mistake', text: 'Avoid blaming the algorithm or the platform for a result you did not control.' },
  { role: 'Marketing', category: 'Creative', text: 'Be ready to critique your own best campaign. Interviewers trust someone more who can see the weakness.' },

  { role: 'Frontend Engineer', category: 'Technical', text: 'Discuss accessibility as part of the design, not as a checklist at the end.' },
  { role: 'Frontend Engineer', category: 'Technical', text: 'When discussing rendering strategy, name the trade-off you are accepting rather than presenting it as a free win.' },
  { role: 'Frontend Engineer', category: 'Preparation', text: 'Have your performance and Lighthouse history ready. Real numbers beat adjectives.' },

  { role: 'Backend Engineer', category: 'Technical', text: 'State your consistency and durability requirements before choosing a database. It is the question they are really asking.' },
  { role: 'Backend Engineer', category: 'Technical', text: 'Mention idempotency and retry behaviour in any design involving queues or webhooks.' },
  { role: 'Backend Engineer', category: 'Preparation', text: 'Be ready to talk through a schema you designed and why you chose those indexes.' },

  { role: 'DevOps Engineer', category: 'Technical', text: 'Talk about rollback before you talk about deployment. That ordering is what on-call experience sounds like.' },
  { role: 'DevOps Engineer', category: 'Technical', text: 'Mention observability early: logs, metrics and traces are part of the design, not an afterthought.' },
  { role: 'DevOps Engineer', category: 'Preparation', text: 'Have one incident you handled end to end, including the postmortem actions you owned afterwards.' },

  { role: 'Project Manager', category: 'Planning', text: 'Always identify the critical path explicitly. It is the single most useful sentence in a planning answer.' },
  { role: 'Project Manager', category: 'Stakeholder', text: 'Escalate with options and a recommendation. Escalating a problem without a path forward reads as noise.' },
  { role: 'Project Manager', category: 'Preparation', text: 'Prepare one example where the schedule slipped and how you recovered it, with the actual cause.' },
];

/* ---------------------------------------------------------------------- run */

const seed = async () => {
  await connectDB();

  // Upsert courses by title so re-running updates rather than duplicates.
  const courseOps = COURSES.map((course) => ({
    updateOne: {
      filter: { title: course.title },
      update: { $set: course },
      upsert: true,
    },
  }));
  const courseResult = await Course.bulkWrite(courseOps);

  const questionOps = QUESTIONS.map((question) => ({
    updateOne: {
      filter: { job_role: question.role, question: question.question },
      update: { $set: { job_role: question.role, ...question } },
      upsert: true,
    },
  }));
  const questionResult = await InterviewQuestion.bulkWrite(questionOps);

  const tipOps = TIPS.map((tip) => ({
    updateOne: {
      filter: { job_role: tip.role, tip_text: tip.text },
      update: { $set: { job_role: tip.role, ...tip } },
      upsert: true,
    },
  }));
  const tipResult = await InterviewTip.bulkWrite(tipOps);

  console.log('Seed complete:');
  console.log(`  courses:             ${courseResult.upsertedCount} added, ${courseResult.modifiedCount} updated`);
  console.log(`  interview questions: ${questionResult.upsertedCount} added, ${questionResult.modifiedCount} updated`);
  console.log(`  interview tips:      ${tipResult.upsertedCount} added, ${tipResult.modifiedCount} updated`);

  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
