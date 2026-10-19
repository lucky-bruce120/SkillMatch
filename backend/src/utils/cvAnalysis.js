/**
 * Deterministic CV analysis.
 *
 * The OpenAI call is the primary path for CV review, but it must not be the
 * only one: when the key is missing, out of credit, or the API is down, the
 * uploader is left staring at a 502 and gets nothing.
 *
 * Everything here works purely from the extracted text plus live job-market
 * demand, so a CV always produces real, useful feedback:
 *   - skills detected in the document (dictionary + word-boundary matching)
 *   - in-demand skills the CV never mentions (the "missing skills")
 *   - a score broken down across five dimensions from checkable signals
 *   - specific, actionable edits derived from those checks
 */

/**
 * Skill dictionary.
 *
 * Grouped by category only for readability - matching is flat. Kept
 * deliberately to skills that appear widely in job descriptions; an obscure
 * entry would produce more false positives than signal.
 */
export const SKILL_DICTIONARY = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'Go', 'Rust', 'Ruby',
  'PHP', 'Swift', 'Kotlin', 'Scala', 'Dart', 'R', 'Perl', 'Haskell', 'Elixir', 'MATLAB',
  'SQL', 'HTML', 'CSS', 'Sass', 'Bash', 'Shell',

  // Frontend
  'React', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Nuxt', 'Svelte', 'Redux', 'Tailwind',
  'Bootstrap', 'Material UI', 'jQuery', 'Webpack', 'Vite', 'GraphQL', 'Apollo',
  'Responsive Design', 'Accessibility', 'Figma', 'Sketch', 'Storybook',

  // Backend
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Ruby on Rails',
  'Laravel', 'REST API', 'GraphQL API', 'Microservices', 'gRPC', 'WebSockets',

  // Data
  'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Elasticsearch', 'Cassandra',
  'DynamoDB', 'Firebase', 'Supabase', 'Snowflake', 'BigQuery', 'Apache Kafka',
  'RabbitMQ', 'Data Modelling', 'ETL', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow',
  'PyTorch', 'Keras', 'Spark', 'Hadoop', 'Airflow', 'dbt', 'Data Visualisation',

  // Cloud & DevOps
  'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Nginx', 'Linux', 'Unix',
  'Serverless', 'Lambda', 'CI/CD', 'Prometheus', 'Grafana', 'Datadog',

  // Mobile
  'React Native', 'Flutter', 'iOS', 'Android', 'SwiftUI', 'Jetpack Compose',

  // Practices
  'Agile', 'Scrum', 'Kanban', 'Jira', 'TDD', 'Unit Testing', 'Integration Testing',
  'CI', 'Code Review', 'Pair Programming', 'Microservice Architecture', 'Event Driven',
  'Domain Driven Design', 'REST', 'OAuth', 'JWT', 'Penetration Testing', 'Selenium',
  'Cypress', 'Jest', 'Pytest',

  // Data / ML concepts
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Statistics',
  'A/B Testing', 'Regression', 'Classification', 'Time Series', 'Data Analysis',
  'Tableau', 'Power BI', 'Looker', 'Excel',

  // Soft / business
  'Leadership', 'Project Management', 'Stakeholder Management', 'Mentoring',
  'Communication', 'Problem Solving', 'Team Building', 'Product Management',
  'Roadmapping', 'Agile Delivery', 'Customer Focus', 'Cross-functional Collaboration',
];

/**
 * Build a match for a skill label that will not fire on substrings.
 *
 * Plain `includes` is unusable here: "R" matches "Responsible", "Go" matches
 * "Going", and "C" matches nearly every CV. Word boundaries plus explicit
 * handling for symbols keep the signal clean.
 */
const buildSkillPattern = (skill) => {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Leading/trailing punctuation such as C++, C# and .NET must be part of the
  // token, so the lookarounds only reject letters and digits.
  if (/^[^a-z0-9]/i.test(skill) || /[^a-z0-9]$/i.test(skill)) {
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
  }

  return new RegExp(`(?<![a-z0-9+])${escaped}(?![a-z0-9+])`, 'i');
};

/** Pre-compiled dictionary, built once at module load. */
const COMPILED_SKILLS = SKILL_DICTIONARY.map((skill) => ({ skill, pattern: buildSkillPattern(skill) }));

/**
 * Find which dictionary skills a document mentions.
 *
 * @param {string} text  extracted CV text
 * @returns {string[]} matched skill labels
 */
export const detectSkills = (text) => {
  if (!text) return [];
  const source = String(text);
  return COMPILED_SKILLS.filter(({ pattern }) => pattern.test(source)).map(({ skill }) => skill);
};

/* --------------------------------------------------------------- sections */

/** Section headings we look for, with the phrases that imply them. */
const SECTION_PATTERNS = [
  { key: 'contact', label: 'Contact details', patterns: [/@/, /\+?\d[\d\s()-]{7,}\d/, /linked\.in|github|portfolio/i] },
  { key: 'summary', label: 'Personal statement', patterns: [/summary|profile|objective|about me/i] },
  { key: 'experience', label: 'Work experience', patterns: [/work experience|employment|professional experience|experience/i] },
  { key: 'education', label: 'Education', patterns: [/education|qualifications|academic|degree/i] },
  { key: 'skills', label: 'Skills section', patterns: [/skills|technical skills|competencies/i] },
  { key: 'projects', label: 'Projects', patterns: [/projects?|portfolio/i] },
  { key: 'certifications', label: 'Certifications', patterns: [/certificat|licen[cs]e/i] },
];

const ACTION_VERBS = [
  'achieved', 'accelerated', 'built', 'created', 'delivered', 'designed', 'developed',
  'drove', 'established', 'generated', 'grew', 'implemented', 'improved', 'increased',
  'launched', 'led', 'managed', 'migrated', 'optimised', 'optimized', 'owned', 'reduced',
  'resolved', 'scaled', 'shipped', 'spearheaded', 'streamlined', 'transformed',
];

const QUANTIFIED = /\b(\d+(\.\d+)?\s*%|\$[\d,]+|£[\d,]+|€[\d,]+|\d+(\.\d+)?\s*(k|m|bn|million|billion|users|customers|people|engineers|records|requests))\b/i;

/**
 * Run every structural check over the text once.
 */
const analyseSignals = (text) => {
  const source = String(text || '');
  const lines = source.split('\n').map((line) => line.trim()).filter(Boolean);
  const words = source.split(/\s+/).filter(Boolean);

  const bullets = lines.filter(
    (line) => /^[-*\u2022\u2013\u2014]/.test(line) || /^(developed|built|led|managed|created|designed|improved|increased|reduced|delivered|implemented|achieved|drove|launched)\b/i.test(line)
  );

  const quantifiedLines = lines.filter((line) => QUANTIFIED.test(line));

  const actionVerbCount = bullets.filter((line) =>
    ACTION_VERBS.some((verb) => new RegExp(`^[-*\u2022\u2013\u2014\\s]*${verb}\\b`, 'i').test(line))
  ).length;

  const presentSections = SECTION_PATTERNS.filter(({ patterns }) =>
    patterns.some((pattern) => pattern.test(source))
  ).map(({ key, label }) => ({ key, label }));

  return {
    lines,
    words,
    wordCount: words.length,
    lineCount: lines.length,
    bullets,
    bulletCount: bullets.length,
    quantifiedCount: quantifiedLines.length,
    actionVerbCount,
    sections: presentSections,
    sectionKeys: new Set(presentSections.map(({ key }) => key)),
    longestLine: lines.reduce((max, line) => Math.max(max, line.length), 0),
  };
};

/** Turn check results into five 0-100 dimensions. */
const scoreSignals = (signals) => {
  const { wordCount, bulletCount, quantifiedCount, actionVerbCount, sectionKeys, lines } = signals;

  // --- Impact: evidence of outcomes rather than duties ---
  const quantificationRatio = bulletCount ? quantifiedCount / bulletCount : 0;
  let impact = 25;
  impact += Math.min(quantifiedCount * 12, 45);
  impact += Math.round(quantificationRatio * 25);
  impact = Math.min(impact, 100);

  // --- Clarity: action-led, evenly written bullets ---
  let clarity = 30;
  clarity += Math.round((bulletCount ? actionVerbCount / bulletCount : 0) * 40);
  if (wordCount >= 250 && wordCount <= 800) clarity += 20;
  const wallsOfText = lines.filter((line) => line.length > 200).length;
  clarity -= wallsOfText * 10;
  clarity = Math.max(0, Math.min(clarity, 100));

  // --- Completeness: the sections a recruiter expects ---
  const expected = ['contact', 'summary', 'experience', 'education', 'skills'];
  const found = expected.filter((key) => sectionKeys.has(key)).length;
  let completeness = Math.round((found / expected.length) * 100);
  // A CV with no experience section is materially worse regardless of the rest.
  if (!sectionKeys.has('experience')) completeness = Math.min(completeness, 45);
  if (!sectionKeys.has('education')) completeness = Math.min(completeness, 80);

  // --- Skills coverage: enough distinct, recognisable skills to match on ---
  let skillsCoverage = 0; // filled in by the caller once skills are detected

  // --- ATS readability: parsable, structured, sane length ---
  let ats = 20;
  if (wordCount > 40) ats += 20;
  if (wordCount >= 250 && wordCount <= 1000) ats += 20;
  if (bulletCount >= 4) ats += 20;
  if (sectionKeys.size >= 3) ats += 20;
  ats = Math.max(0, Math.min(ats, 100));

  return {
    impact: Math.round(impact),
    clarity: Math.round(clarity),
    completeness: Math.round(completeness),
    skillsCoverage,
    atsReadability: Math.round(ats),
  };
};

/**
 * Analyse a CV without calling any external service.
 *
 * @param {string} cvText           text extracted from the uploaded file
 * @param {object} options
 * @param {string[]} options.profileSkills  skills already on the user's profile
 * @param {Array<{skill:string, openings:number}>} options.marketSkills  live demand
 * @param {boolean} options.textExtractable false when the PDF yielded no text
 * @returns {object} in the same shape the AI path returns
 */
export const analyseCvLocally = (cvText, { profileSkills = [], marketSkills = [], textExtractable = true } = {}) => {
  const signals = analyseSignals(cvText);
  const { sectionKeys } = signals;
  const detected = detectSkills(cvText);

  // A profile skill the CV never mentions is still a match for job purposes,
  // so count both towards coverage.
  const owned = [...new Set([...detected, ...profileSkills])];

  const score = scoreSignals(signals);
  score.skillsCoverage = Math.min(100, Math.round((owned.length / 12) * 100));

  const cvScore = Math.round(
    score.impact * 0.3 + score.clarity * 0.2 + score.completeness * 0.2 +
    score.skillsCoverage * 0.2 + score.atsReadability * 0.1
  );

  /* ---------------------------------------------------- missing skills */

  const ownedKeys = owned.map((value) => String(value).toLowerCase());
  const mentioned = (skill) => ownedKeys.some((key) => key.includes(String(skill).toLowerCase()));

  const missingSkills = (marketSkills || [])
    .filter((entry) => entry && entry.skill && !mentioned(entry.skill))
    .sort((a, b) => (b.openings || 0) - (a.openings || 0))
    .slice(0, 8)
    .map((entry) => ({
      skill: entry.skill,
      why: `Asked for in ${entry.openings} open role${entry.openings === 1 ? '' : 's'} on SkillMatch right now, and it does not appear anywhere in your CV.`,
      priority: entry.openings >= 3 ? 'high' : entry.openings >= 2 ? 'medium' : 'low',
    }));

  /* --------------------------------------------------------- strengths */

  const strengths = [];
  if (signals.quantifiedCount >= 3) {
    strengths.push(`${signals.quantifiedCount} achievements are backed by numbers, which is what makes a CV easy to scan.`);
  }
  if (signals.actionVerbCount >= 3) {
    strengths.push('Most bullets start with an action verb, so your impact reads quickly.');
  }
  if (signals.sectionKeys.has('summary')) strengths.push('You have a summary section, so recruiters know your focus immediately.');
  if (detected.length >= 10) strengths.push(`${detected.length} recognisable skills were detected, which gives the matcher plenty to work with.`);
  if (signals.sectionKeys.has('projects')) strengths.push('A projects section backs up your claims with evidence.');
  if (!strengths.length) strengths.push('The document is short and readable, which is a reasonable starting point.');

  /* ------------------------------------------------------ action items */

  const actionItems = [];
  if (!signals.sectionKeys.has('summary')) {
    actionItems.push('Add a three-line summary at the top stating your role, years of experience and the kind of work you want.');
  }
  if (!signals.sectionKeys.has('experience')) {
    actionItems.push('Add a Work Experience section - it is the single section recruiters scan for and this CV does not appear to have one.');
  }
  if (signals.bulletCount === 0) {
    actionItems.push('Turn your paragraphs into bullet points. Dense blocks of text are skipped, especially by screeners.');
  }
  if (signals.quantifiedCount < 3) {
    actionItems.push('Add numbers to at least three achievements - a percentage, a revenue figure, a time saved, a team size.');
  }
  if (signals.actionVerbCount < signals.bulletCount / 2) {
    actionItems.push('Start more bullets with a past-tense action verb such as led, built, cut or increased.');
  }
  if (detected.length < 6) {
    actionItems.push('Only a few skills were detected in the wording. List your actual tools and technologies explicitly in a Skills section.');
  }
  if (missingSkills.length) {
    actionItems.push(`Add the in-demand skills you are missing: ${missingSkills.slice(0, 3).map((entry) => entry.skill).join(', ')}.`);
  }
  if (signals.wordCount > 1000) {
    actionItems.push(`This is ${signals.wordCount} words. Cut it to roughly 400-600 by removing anything older than about ten years.`);
  }
  if (signals.wordCount < 120 && signals.wordCount > 0) {
    actionItems.push(`This CV is only ${signals.wordCount} words. Add more detail to each role until you can show what you actually did.`);
  }

  /* ------------------------------------------------------ ATS warnings */

  const atsWarnings = [];
  if (!textExtractable) {
    atsWarnings.push('No text could be read from this file, so an applicant tracking system would see a blank document.');
  }
  if (!sectionKeys.has('contact')) {
    atsWarnings.push('No email address or phone number was detected. Most systems discard CVs without contact details.');
  }
  if (!sectionKeys.has('education')) {
    atsWarnings.push('No education section was detected, which many filters require.');
  }
  if (!sectionKeys.has('skills')) {
    atsWarnings.push('There is no explicit Skills section, so keyword matching will rely on prose elsewhere in the CV.');
  }
  if (signals.longestLine > 250) {
    atsWarnings.push('At least one line runs very long. Long unbroken text is a common reason ATS parsers lose content.');
  }
  if (!atsWarnings.length) {
    atsWarnings.push('No structural problems detected that would block automated parsing.');
  }

  /* ---------------------------------------------------------- narrative */

  const summary =
    `This CV presents ${detected.length} recognisable skills and scores ${score.impact}/100 for evidence of impact. ` +
    (missingSkills.length
      ? `${missingSkills.length} skill${missingSkills.length === 1 ? '' : 's'} currently in demand are not mentioned anywhere in it.`
      : 'It covers the skills employers are currently asking for.') +
    ` Start with: ${actionItems[0] || 'quantify more of your achievements.'}`;

  const weakest = Object.entries(score).sort((a, b) => a[1] - b[1])[0];

  const sections = {
    experience: signals.sectionKeys.has('experience')
      ? `You have a ${signals.sectionKeys.has('experience') ? 'work experience section' : ''} with ${signals.bulletCount} bullets, of which ${signals.quantifiedCount} contain a number. ${signals.quantifiedCount < signals.bulletCount / 2 ? 'Add outcomes to the rest.' : 'Keep this density of evidence up.'}`
      : 'No work experience section was detected. This is the most important part of the CV and cannot be inferred from skills alone.',
    education: signals.sectionKeys.has('education')
      ? 'An education section was detected. Include the qualification, institution and year so filters can match on it.'
      : 'No education section was detected. Add your qualifications, institution and graduation year.',
    skills: detected.length
      ? `${detected.length} skills were recognised in the wording: ${detected.slice(0, 8).join(', ')}${detected.length > 8 ? ', and more.' : '.'} Keep them listed explicitly so they are machine-readable.`
      : 'No recognisable skills were found in the wording. Name your tools and technologies directly rather than describing what you did.',
  };

  return {
    cvScore,
    scoreBreakdown: score,
    summary,
    strengths: strengths.slice(0, 6),
    extractedSkills: detected,
    missingSkills,
    actionItems: actionItems.slice(0, 8),
    atsWarnings,
    sections,
    wordCount: signals.wordCount,
    weakestDimension: weakest ? weakest[0] : null,
  };
};
