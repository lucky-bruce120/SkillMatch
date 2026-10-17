import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell, Briefcase, Bookmark, CheckCircle2, Users, Shield, TrendingUp,
  ArrowRight, Inbox, FileText, Sparkles, ChartColumn, UserPlus, Megaphone,
  MapPin, Radio, RefreshCw, Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ helpers */

const timeAgo = (value) => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(value).toLocaleDateString();
};

/** Icons are keyed off the `kind` the backend assigns to each item. */
const KIND_ICONS = {
  notification: Bell,
  application: FileText,
  applicant: Users,
  saved: Bookmark,
  job: Briefcase,
  user: UserPlus,
  activity: Radio,
  chart: ChartColumn,
  sparkles: Sparkles,
  shield: Shield,
  users: Users,
  megaphone: Megaphone,
};

const KIND_ACCENTS = {
  notification: 'bg-primary/15 text-primary',
  application: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  applicant: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  saved: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  job: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  user: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  activity: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  chart: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  sparkles: 'bg-primary/15 text-primary',
  shield: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  users: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  megaphone: 'bg-primary/15 text-primary',
};

const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  reviewed: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  deactivated: 'bg-destructive/10 text-destructive border-destructive/20',
  draft: 'bg-muted text-muted-foreground border-border',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS = {
  pending: 'Pending',
  reviewed: 'Under review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  active: 'Active',
  deactivated: 'Deactivated',
  draft: 'Draft',
  inactive: 'Inactive',
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] || ''}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
};

/** Icons for the summary cards, matched on the label the backend sends. */
const STAT_ICONS = [
  { match: /applicant/i, icon: Users },
  { match: /application/i, icon: FileText },
  { match: /interview/i, icon: CheckCircle2 },
  { match: /job/i, icon: Briefcase },
  { match: /saved/i, icon: Bookmark },
  { match: /alert|notification/i, icon: Bell },
  { match: /user/i, icon: Users },
  { match: /skill/i, icon: TrendingUp },
  { match: /week/i, icon: TrendingUp },
];

const statIcon = (label) => (STAT_ICONS.find((entry) => entry.match.test(label)) || { icon: TrendingUp }).icon;

/** Quick actions per role. */
const QUICK_ACTIONS = {
  'Job Seeker': [
    { to: '/jobs', label: 'Browse matched jobs', icon: Briefcase, variant: 'default' },
    { to: '/applications', label: 'My applications', icon: FileText, variant: 'outline' },
    { to: '/saved-jobs', label: 'Saved jobs', icon: Bookmark, variant: 'outline' },
    { to: '/profile', label: 'Complete my profile', icon: CheckCircle2, variant: 'outline' },
  ],
  Employer: [
    { to: '/employer/jobs/new', label: 'Post a new job', icon: Briefcase, variant: 'default' },
    { to: '/employer/applications', label: 'Review applicants', icon: Users, variant: 'outline' },
    { to: '/employer/jobs', label: 'Manage jobs', icon: Briefcase, variant: 'outline' },
    { to: '/job-market-analytics', label: 'Market analytics', icon: TrendingUp, variant: 'outline' },
  ],
  Admin: [
    { to: '/admin/dashboard', label: 'Admin dashboard', icon: Shield, variant: 'default' },
    { to: '/admin/jobs', label: 'Moderate jobs', icon: Briefcase, variant: 'outline' },
    { to: '/admin/users', label: 'Manage users', icon: Users, variant: 'outline' },
  ],
};

/** First-run guidance. Shown until the account has some real activity. */
const ONBOARDING = {
  'Job Seeker': {
    title: 'Welcome to SkillMatch — here is how to get your first match',
    body: 'Add your skills, experience and upload a CV. We use them to score every open role, so a complete profile means far better matches.',
    links: [
      { to: '/profile', label: 'Complete profile' },
      { to: '/jobs', label: 'Browse jobs' },
    ],
  },
  Employer: {
    title: 'Welcome to SkillMatch — post your first role',
    body: 'Once you publish a job, every application lands here with the candidate profile attached, so you can move applicants through review in one place.',
    links: [
      { to: '/employer/jobs/new', label: 'Post a job' },
      { to: '/employer/jobs', label: 'Manage jobs' },
    ],
  },
  Admin: {
    title: 'Platform overview',
    body: 'Review flagged postings and manage user accounts from the admin tools.',
    links: [
      { to: '/admin/jobs', label: 'Moderate jobs' },
      { to: '/admin/users', label: 'Manage users' },
    ],
  },
};

const EMPTY_PERSONAL = {
  'Job Seeker': 'Your applications, saved jobs and alerts will show up here as soon as you get started.',
  Employer: 'Applications to your postings will appear here as soon as candidates start applying.',
  Admin: 'New postings and new sign-ups will appear here as they happen.',
};

/* ------------------------------------------------------------------ the row */

/**
 * One row in a feed. Renders as a link when the item has an `href`, which keeps
 * the whole row clickable without nesting interactive elements.
 */
const FeedRow = ({ item, showStatus = true }) => {
  const Icon = KIND_ICONS[item.kind] || Bell;
  const accent = item.unread ? 'bg-primary/15 text-primary' : KIND_ACCENTS[item.kind] || 'bg-muted text-muted-foreground';

  const body = (
    <>
      <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {item.title}
          {item.unread && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
        </p>
        {item.meta && <p className="text-xs text-muted-foreground truncate">{item.meta}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showStatus && <StatusBadge status={item.status} />}
        <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(item.timestamp)}</span>
      </div>
    </>
  );

  const className = 'flex items-center gap-3 px-6 py-4';

  return (
    <li>
      {item.href ? (
        <Link to={item.href} className={`${className} hover:bg-muted/50 transition-colors`}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
};

const EmptyState = ({ icon: Icon = Inbox, title, body }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="font-medium">{title}</p>
    {body && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{body}</p>}
  </div>
);

/* ---------------------------------------------------------------- main view */

const AuthenticatedHome = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const token = currentUser?.token;

  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setError('');

    try {
      const data = await apiServerClient.fetch('/news/feed');
      setFeed(data);
    } catch (err) {
      setError('We could not load the latest news. Please refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const news = feed?.news || [];
  const announcements = feed?.announcements || [];

  // On a quiet platform there may be no dated headlines yet. Fall back to the
  // evergreen announcements so a brand new account never stares at a blank card.
  const newsItems = news.length
    ? news
    : announcements.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        meta: item.body,
        href: item.href,
      }));

  const personal = feed?.personal || [];
  const trendingSkills = feed?.platform?.trendingSkills || [];
  const latestJobs = feed?.platform?.latestJobs || [];
  const stats = Object.entries(feed?.stats || {}).slice(0, 4);

  const displayName =
    feed?.viewer?.name ||
    currentUser?.name ||
    currentUser?.full_name ||
    currentUser?.email?.split('@')[0] ||
    'there';

  const unreadCount = personal.filter((item) => item.unread).length;
  const quickActions = QUICK_ACTIONS[role] || [];
  const onboarding = ONBOARDING[role];

  // Only nudge brand new accounts — once there is real activity the feed speaks for itself.
  const showOnboarding = Boolean(onboarding) && !stats.some(([, value]) => value > 0);

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Greeting */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">{role}</span>
            <span className="text-muted-foreground/60">·</span>
            <Link to="/notifications" className="hover:text-foreground transition-colors">
              {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome back, {displayName}</h1>
          <p className="text-muted-foreground mt-2">
            Here is what is happening on SkillMatch and on your account.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh news
        </Button>
      </header>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(([label, value]) => {
            const Icon = statIcon(label);
            return (
              <Card key={label} className="shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-tight">{value}</p>
                    <p className="text-sm text-muted-foreground truncate">{label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Platform news */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Latest news
                  </CardTitle>
                  <CardDescription>New jobs, in-demand skills and platform updates.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/jobs">
                    Browse jobs <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {newsItems.length === 0 ? (
                <EmptyState
                  icon={Radio}
                  title="No news yet"
                  body="As soon as employers start posting roles, the latest openings will appear right here."
                />
              ) : (
                <ul className="divide-y">
                  {newsItems.map((item) => (
                    <FeedRow key={item.id} item={item} showStatus={false} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* The signed-in user's own activity */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Your recent activity
                  </CardTitle>
                  <CardDescription>Your applications and updates, newest first.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/notifications">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {personal.length === 0 ? (
                <EmptyState title="Nothing here yet" body={EMPTY_PERSONAL[role]} />
              ) : (
                <ul className="divide-y">
                  {personal.slice(0, 10).map((item) => (
                    <FeedRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {showOnboarding && onboarding && (
            <Card className="shadow-sm border-primary/20 bg-primary/5">
              <CardContent className="p-5 space-y-3">
                <p className="font-semibold">{onboarding.title}</p>
                <p className="text-sm text-muted-foreground">{onboarding.body}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {onboarding.links.map((link) => (
                    <Button key={link.to} size="sm" variant="outline" asChild>
                      <Link to={link.to}>{link.label}</Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trending skills
              </CardTitle>
              <CardDescription>Most requested by employers right now.</CardDescription>
            </CardHeader>
            <CardContent>
              {trendingSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skill data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {trendingSkills.slice(0, 6).map((entry, index) => (
                    <li key={entry.skill} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-muted-foreground w-4 shrink-0">
                          {index + 1}
                        </span>
                        <span className="truncate font-medium">{entry.skill}</span>
                      </span>
                      <Badge variant="secondary" className="shrink-0">
                        {entry.openings} {entry.openings === 1 ? 'role' : 'roles'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="ghost" size="sm" className="mt-3 px-0" asChild>
                <Link to="/job-market-analytics">
                  Full market report <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {latestJobs.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Just posted
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestJobs.slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    to={`/job/${job.id}`}
                    className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                    {job.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {job.location} · {timeAgo(job.created)}
                      </p>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {announcements.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  What&apos;s new
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {announcements.map((item) => {
                  const Icon = KIND_ICONS[item.kind] || Sparkles;
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${KIND_ACCENTS[item.kind] || 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.body}</p>
                        {item.href && (
                          <Link
                            to={item.href}
                            className="mt-1 inline-flex items-center text-xs font-medium text-primary hover:underline"
                          >
                            Take a look <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {quickActions.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickActions.map((action) => (
                  <Button key={action.to} variant={action.variant} className="w-full justify-start" asChild>
                    <Link to={action.to}>
                      <action.icon className="mr-2 h-4 w-4" /> {action.label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthenticatedHome;
