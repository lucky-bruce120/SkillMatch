import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Heart, Eye, ArrowRight, Briefcase } from 'lucide-react';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ apps: 0, saved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch profile
        try {
          const profileResponse = await apiServerClient.fetch('/profile', {
            headers: { 'Authorization': `Bearer ${currentUser?.token}` }
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setProfile(profileData);
          } else {
            setProfile(null);
          }
        } catch (e) {
          // Profile might not exist yet
          setProfile(null);
        }

        // Fetch applications
        const appsResponse = await apiServerClient.fetch('/applications', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        let appsData = [];
        if (appsResponse.ok) {
          appsData = await appsResponse.json();
          setApplications(appsData.slice(0, 5)); // Get first 5 applications
        }

        // Fetch saved jobs count
        const savedResponse = await apiServerClient.fetch('/saved-jobs', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });

        let savedCount = 0;
        if (savedResponse.ok) {
          const savedData = await savedResponse.json();
          savedCount = savedData.length;
        }

        setStats({
          apps: appsData.length,
          saved: savedCount
        });

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

  const getStatusColor = (status) => {
    switch(status) {
      case 'Applied': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Shortlisted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.full_name || currentUser.name || 'User'}!</h1>
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
              <h3 className="text-2xl font-bold">{profile?.profile_strength || 0}%</h3>
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
                        {app.status}
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
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completion</span>
                <span className="font-medium">{profile?.profile_strength || 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${profile?.profile_strength || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</h4>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/profile">Update Resume</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/profile">Add New Skills</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/saved-jobs">View Saved Jobs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
