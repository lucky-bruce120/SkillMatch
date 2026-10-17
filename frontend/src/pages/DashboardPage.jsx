import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { getFirstName } from '@/lib/displayName.js';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Heart, Eye, ArrowRight, Briefcase, Plus, Target } from 'lucide-react';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ apps: 0, saved: 0 });
  const [sections, setSections] = useState({ skills: 0, experience: 0, education: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch profile
        try {
          const profileData = await apiServerClient.fetch('/profile', {
            headers: { 'Authorization': `Bearer ${currentUser?.token}` }
          });
          setProfile(profileData);
        } catch (e) {
          // Profile might not exist yet
          setProfile(null);
        }

        // Fetch applications
        const appsData = await apiServerClient.fetch('/apply-job', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        setApplications(appsData.slice(0, 5));

        // Fetch saved jobs count
        const savedData = await apiServerClient.fetch('/saved-jobs', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });

        setStats({
          apps: appsData.length,
          saved: savedData.length
        });

        // Counts for the profile completeness card. Each is independent so one
        // failing request cannot blank the whole dashboard.
        const countOf = async (path) => {
          try {
            const data = await apiServerClient.fetch(path, {
              headers: { 'Authorization': `Bearer ${currentUser?.token}` }
            });
            return Array.isArray(data) ? data.length : 0;
          } catch {
            return 0;
          }
        };

        const [skills, experience, education] = await Promise.all([
          countOf('/profile/skills'),
          countOf('/profile/experience'),
          countOf('/profile/education'),
        ]);
        setSections({ skills, experience, education });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  // The items that make a profile useful for skill-based job matching. Each
  // knows which Profile Settings tab completes it.
  const profileChecklist = useMemo(
    () => [
      { label: 'Full name', tab: 'personal', done: Boolean(profile?.full_name?.trim()) },
      { label: 'Bio', tab: 'personal', done: Boolean(profile?.bio?.trim()) },
      { label: 'Location', tab: 'personal', done: Boolean(profile?.location?.trim()) },
      { label: 'Phone', tab: 'personal', done: Boolean(profile?.phone?.trim()) },
      { label: 'Profile photo', tab: 'personal', done: Boolean(profile?.picture) },
      { label: 'Resume / CV', tab: 'resume', done: Boolean(profile?.cv) },
      { label: 'At least one skill', tab: 'skills', done: sections.skills > 0 },
      { label: 'Work experience', tab: 'experience', done: sections.experience > 0 },
      { label: 'Education', tab: 'education', done: sections.education > 0 },
      {
        label: 'Job preferences',
        tab: 'preferences',
        done: Boolean(
          profile?.preferences?.desired_roles?.length || profile?.preferences?.preferred_locations?.length
        ),
      },
    ],
    [profile, sections]
  );

  const profileItemsDone = profileChecklist.filter((item) => item.done).length;
  const profileItems = profileChecklist;
  const profileCompletion = Math.round((profileItemsDone / profileItems.length) * 100);
  const missingProfileItems = profileChecklist.filter((item) => !item.done);

  // The Application.status enum is pending | reviewed | accepted | rejected.
  // This used to switch on display labels ('Applied', 'Shortlisted', ...) that
  // are not stored, so every badge fell through to the grey default.
  const STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    reviewed: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  const STATUS_LABELS = {
    pending: 'Pending',
    reviewed: 'Under review',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };

  const getStatusColor = (status) => STATUS_STYLES[status] || 'bg-gray-100 text-gray-800';
  const getStatusLabel = (status) => STATUS_LABELS[status] || status;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {getFirstName(profile, currentUser)}!</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your job search.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to="/profile">Edit Profile</Link>
          </Button>
          <Button asChild>
            <Link to="/jobs">Browse Jobs</Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Applications</p>
              <h3 className="text-2xl font-bold">{stats.apps}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saved Jobs</p>
              <h3 className="text-2xl font-bold">{stats.saved}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-accent text-accent-foreground rounded-xl">
              <Eye size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Profile Strength</p>
              <h3 className="text-2xl font-bold">{profileCompletion}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Applications */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Applications</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/applications" className="flex items-center gap-1">
                View All <ArrowRight size={16} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <Briefcase size={20} className="text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium line-clamp-1">{app.job_id?.title || 'Unknown Job'}</h4>
                        <p className="text-sm text-muted-foreground">{app.job_id?.company || 'Unknown Company'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className={getStatusColor(app.status)}>
                        {getStatusLabel(app.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg border-dashed">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No applications yet</h3>
                <p className="text-muted-foreground mb-4">Start applying to jobs to see them here.</p>
                <Button asChild>
                  <Link to="/jobs">Find Jobs</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Profile Status */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Status</CardTitle>
            <CardDescription>
              {profileItemsDone === profileItems.length
                ? 'Your profile is complete.'
                : `Add the ${profileItems.length - profileItemsDone} missing item${profileItems.length - profileItemsDone === 1 ? '' : 's'} to improve your matches.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completion</span>
                <span className="font-medium">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
            </div>

            {/* Each row links straight to the tab that fixes it, rather than
                dumping the user on the Personal Info tab every time. */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</h4>

              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/profile?tab=resume">
                  <FileText className="mr-2 h-4 w-4" />
                  {profile?.cv ? 'Update Resume' : 'Upload Resume'}
                </Link>
              </Button>

              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/profile?tab=skills">
                  <Plus className="mr-2 h-4 w-4" /> Add New Skills
                </Link>
              </Button>

              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/profile?tab=experience">
                  <Briefcase className="mr-2 h-4 w-4" /> Add Experience
                </Link>
              </Button>

              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/profile?tab=preferences">
                  <Target className="mr-2 h-4 w-4" /> Set Job Preferences
                </Link>
              </Button>

              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/saved-jobs">
                  <Heart className="mr-2 h-4 w-4" /> View Saved Jobs
                </Link>
              </Button>
            </div>

            {/* List exactly what is still missing, with a jump to each one. */}
            {missingProfileItems.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Still missing
                </h4>
                {missingProfileItems.map((item) => (
                  <Link
                    key={item.label}
                    to={`/profile?tab=${item.tab}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors group"
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground">
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
