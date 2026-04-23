import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Users, Calendar, Plus, ArrowRight } from 'lucide-react';

const EmployerDashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ jobs: 0, applications: 0, interviews: 0 });
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    const fetchDashboardData = async () => {
      try {
        // Fetch dashboard stats
        const statsData = await apiServerClient.fetch('/employer/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        setStats(statsData);

        // Fetch recent applications
        const appsData = await apiServerClient.fetch('/employer/dashboard/recent-applications', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        setRecentApps(appsData);

      } catch (error) {
        console.error("Error fetching employer dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="dashboard-container space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Employer Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your job postings and candidates.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/employer/jobs/new"><Plus className="mr-2 h-4 w-4" /> Post a Job</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
              <h3 className="text-2xl font-bold">{stats.jobs}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
              <h3 className="text-2xl font-bold">{stats.applications}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-accent/10 text-accent rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Interviews</p>
              <h3 className="text-2xl font-bold">{stats.interviews}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Applications</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/employer/jobs" className="flex items-center gap-1">
              View All Jobs <ArrowRight size={16} />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentApps.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Job Title</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app) => (
                    <tr key={app._id}>
                      <td className="font-medium">{app.job_seeker_id?.email || 'Unknown'}</td>
                      <td>{app.job_id?.title || 'Unknown Job'}</td>
                      <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                      <td>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-secondary/10 text-secondary">
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/employer/candidate/${app.job_seeker_id?._id}`}>View Profile</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No applications yet</h3>
              <p className="text-muted-foreground mb-4">Post a job to start receiving applications.</p>
              <Button asChild>
                <Link to="/employer/jobs/new">Post a Job</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployerDashboard;
