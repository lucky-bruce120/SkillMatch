import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const ManageJobsPage = () => {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const response = await apiServerClient.fetch('/employer/jobs', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      const jobsData = await response.json();
      setJobs(jobsData);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchJobs();
  }, [currentUser]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    
    try {
      await apiServerClient.fetch(`/employer/jobs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      setJobs(jobs.filter(j => j._id !== id));
      toast.success("Job deleted successfully");
    } catch (error) {
      toast.error("Failed to delete job");
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
          <h1 className="dashboard-title">Manage Jobs</h1>
          <p className="text-muted-foreground mt-1">View and edit your job postings.</p>
        </div>
        <Button asChild>
          <Link to="/employer/jobs/new"><Plus className="mr-2 h-4 w-4" /> Post a Job</Link>
        </Button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Location</th>
              <th>Type</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <tr key={job._id}>
                  <td className="font-medium">{job.title}</td>
                  <td>{job.location} ({job.remoteType})</td>
                  <td>{job.jobType}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      job.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status || 'published'}
                    </span>
                  </td>
                  <td className="text-right space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/employer/jobs/${job._id}/applicants`} title="View Applicants">
                        <Users size={16} />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast("Edit functionality coming soon")} title="Edit">
                      <Edit size={16} />
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(job._id)} title="Delete">
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-8 text-muted-foreground">
                  No jobs posted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageJobsPage;
