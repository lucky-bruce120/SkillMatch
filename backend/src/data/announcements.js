/**
 * Evergreen platform announcements shown on the signed-in home page.
 *
 * These are deliberately static, date-less items: they describe what the
 * platform can do rather than pretending to be time-sensitive news. Anything
 * that actually depends on live data (new jobs, trending skills, recent
 * applications) is generated in routes/news.js instead.
 *
 * `audience` restricts an item to specific roles; omit it to show it to all.
 */
const ANNOUNCEMENTS = [
  {
    id: 'ann-ai-matching',
    audience: ['job_seeker'],
    kind: 'sparkles',
    title: 'AI match scores are live',
    body: 'Every job now carries a match score built from your skills, experience level and location. Open a job to see how well it fits your profile.',
    href: '/jobs',
  },
  {
    id: 'ann-cv-analyzer',
    audience: ['job_seeker'],
    kind: 'sparkles',
    title: 'New: AI CV analyser',
    body: 'Upload your CV and get a score, the skills it already proves, and a list of the gaps worth closing before you apply.',
    href: '/cv-analyzer',
  },
  {
    id: 'ann-skill-gap',
    audience: ['job_seeker'],
    kind: 'chart',
    title: 'Close your skill gaps before you apply',
    body: 'The skill gap report compares what employers ask for against what you have, then recommends courses for the exact gaps it finds.',
    href: '/skill-gap',
  },
  {
    id: 'ann-interview-prep',
    audience: ['job_seeker'],
    kind: 'sparkles',
    title: 'Interview prep for any role',
    body: 'Pick a job title and get likely questions with model answers and tips, so you can walk into any interview prepared.',
    href: '/interview-prep',
  },
  {
    id: 'ann-employer-applicants',
    audience: ['employer'],
    kind: 'users',
    title: 'Review applicants in one place',
    body: 'Every application to your roles lands in a single dashboard with the candidate profile, their CV and one-click status updates.',
    href: '/employer/applications',
  },
  {
    id: 'ann-employer-analytics',
    audience: ['employer'],
    kind: 'chart',
    title: 'See which skills your market wants',
    body: 'Job market analytics show the skills employers are demanding right now, so you can write postings that actually attract candidates.',
    href: '/job-market-analytics',
  },
  {
    id: 'ann-admin-moderation',
    audience: ['admin'],
    kind: 'shield',
    title: 'Moderation queue',
    body: 'New and updated postings are visible from the admin job list, where you can approve or deactivate them and suspend accounts.',
    href: '/admin/jobs',
  },
];

/**
 * @param {string} role - the raw database role, e.g. 'job_seeker'
 * @returns {Array} announcements relevant to that role
 */
export const getAnnouncements = (role) =>
  ANNOUNCEMENTS.filter((item) => !item.audience || item.audience.includes(role)).map((item) => {
    // `audience` is only used for filtering; it is not part of the response.
    const rest = { ...item };
    delete rest.audience;
    return rest;
  });

export default ANNOUNCEMENTS;
