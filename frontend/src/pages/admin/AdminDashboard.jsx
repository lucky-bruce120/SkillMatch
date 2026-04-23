import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Briefcase, FileText, AlertTriangle, ArrowRight } from 'lucide-react';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ users: 0, jobs: 0, applications: 0, reports: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const result = await apiServerClient.fetch('/admin/stats', {
          headers: { Authorization: `Bearer ${currentUser?.token}` }
        });
        setStats(result);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) fetchAdminData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="dashboard-container space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Admin Overview</h1>
          <p className="text-muted-foreground mt-1">Platform metrics and quick actions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <h3 className="text-2xl font-bold">{stats.users}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
              <h3 className="text-2xl font-bold">{stats.jobs}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-accent/10 text-accent rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Applications</p>
              <h3 className="text-2xl font-bold">{stats.applications}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
              <h3 className="text-2xl font-bold">{stats.reports}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/users" className="flex items-center gap-1">
                Manage <ArrowRight size={16} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">View, activate, or deactivate user accounts across the platform.</p>
            <Button asChild className="w-full"><Link to="/admin/users">Go to Users</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Job Moderation</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/jobs" className="flex items-center gap-1">
                Manage <ArrowRight size={16} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Review posted jobs and manage listing status.</p>
            <Button asChild className="w-full"><Link to="/admin/jobs">Go to Jobs</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
