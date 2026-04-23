import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Building2, Calendar, ArrowRight } from 'lucide-react';

const ApplicationsPage = () => {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const getJobId = (application) =>
    application.job_id?._id || application.job_id?.id || application.job_id;

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const applicationsData = await apiServerClient.fetch('/apply-job', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        setApplications(applicationsData);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) fetchApplications();
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
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-4">
        <Skeleton className="h-10 w-48 mb-8" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">My Applications</h1>

      {applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Briefcase className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        <Link to={`/job/${getJobId(app)}`} className="hover:text-primary transition-colors">
                          {app.job_id?.title || 'Unknown Job'}
                        </Link>
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 size={14} /> {app.job_id?.company || 'Unknown Company'}</span>
                        <span className="flex items-center gap-1"><Calendar size={14} /> Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                    <Badge variant="secondary" className={`px-3 py-1 text-sm ${getStatusColor(app.status)}`}>
                      {app.status}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild className="hidden md:flex">
                      <Link to={`/job/${getJobId(app)}`}>View Job <ArrowRight size={16} className="ml-2" /></Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
          <Briefcase className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">No applications yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">You haven't applied to any jobs yet. Start browsing to find your perfect match.</p>
          <Button asChild size="lg">
            <Link to="/jobs">Browse Jobs</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;
