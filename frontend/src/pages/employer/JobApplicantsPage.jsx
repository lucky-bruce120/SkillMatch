import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const JobApplicantsPage = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job details
        const jobResponse = await apiServerClient.fetch(`/jobs/search?location=&salary_min=&salary_max=&job_type=&remote_type=&search_term=`, {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        const allJobs = await jobResponse.json();
        const job = allJobs.find(j => j._id === id);
        setJob(job);

        // Fetch applications for this job
        const appsResponse = await apiServerClient.fetch(`/employer/jobs/${id}/applications`, {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        const appsData = await appsResponse.json();
        setApplicants(appsData);
      } catch (error) {
        console.error("Error fetching applicants:", error);
        toast.error("Failed to load applicants");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) fetchData();
  }, [id, currentUser]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await apiServerClient.fetch(`/employer/applications/${appId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` },
        body: JSON.stringify({ status: newStatus })
      });
      setApplicants(applicants.map(app => app._id === appId ? { ...app, status: newStatus } : app));
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container space-y-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
        <Link to="/employer/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs</Link>
      </Button>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Applicants for {job?.title}</h1>
          <p className="text-muted-foreground mt-1">Review and manage candidates for this position.</p>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Applied Date</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applicants.length > 0 ? (
              applicants.map((app) => (
                <tr key={app._id}>
                  <td className="font-medium">{app.job_seeker_id?.email || 'Unknown'}</td>
                  <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                  <td>
                    <Select value={app.status} onValueChange={(v) => handleStatusChange(app._id, v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Applied">Applied</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Accepted">Accepted</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="text-right space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/employer/candidate/${app.job_seeker_id?._id}`} title="View Profile">
                        <Eye size={16} className="mr-2" /> Profile
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast("Interview scheduling coming soon")}>
                      <Calendar size={16} className="mr-2" /> Invite
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-8 text-muted-foreground">
                  No applicants yet for this job.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobApplicantsPage;
