import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const JobModerationPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const result = await pb.collection('jobs').getList(1, 50, {
        sort: '-created',
        $autoCancel: false
      });
      setJobs(result.items);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await pb.collection('jobs').update(id, { status: newStatus }, { $autoCancel: false });
      setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));
      toast.success(`Job marked as ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update job status");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Job Moderation</h1>
          <p className="text-muted-foreground mt-1">Review and moderate job postings.</p>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Posted Date</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="font-medium">{job.title}</td>
                <td>{job.company}</td>
                <td>{new Date(job.created).toLocaleDateString()}</td>
                <td>
                  <Badge variant={job.status === 'published' ? 'default' : job.status === 'closed' ? 'secondary' : 'outline'}>
                    {job.status || 'draft'}
                  </Badge>
                </td>
                <td className="text-right space-x-2">
                  {job.status !== 'published' && (
                    <Button variant="outline" size="sm" onClick={() => updateStatus(job.id, 'published')} className="text-green-600 hover:bg-green-50">
                      Approve
                    </Button>
                  )}
                  {job.status !== 'closed' && (
                    <Button variant="outline" size="sm" onClick={() => updateStatus(job.id, 'closed')} className="text-destructive hover:bg-destructive/10">
                      Close
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobModerationPage;
