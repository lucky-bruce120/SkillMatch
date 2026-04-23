import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import JobCard from '@/components/JobCard.jsx';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

const SavedJobsPage = () => {
  const { currentUser } = useAuth();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedJobs();
  }, [currentUser]);

  const fetchSavedJobs = async () => {
    try {
      const response = await apiServerClient.fetch('/saved-jobs', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (response.ok) {
        const savedJobs = await response.json();

        // Transform the data to match expected format
        const jobs = savedJobs.map(item => ({
          ...item.job,
          savedRecordId: item.id,
          savedAt: item.created
        }));

        setSavedJobs(jobs);
      }
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (jobId) => {
    try {
      const response = await apiServerClient.fetch(`/saved-jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (response.ok) {
        setSavedJobs(savedJobs.filter(j => j.id !== jobId));
        toast.success("Removed from saved jobs");
      } else {
        toast.error("Failed to remove job");
      }
    } catch (error) {
      toast.error("Failed to remove job");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Saved Jobs</h1>

      {savedJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedJobs.map(job => (
            <JobCard 
              key={job.id} 
              job={job} 
              isSaved={true}
              onSave={handleRemoveSaved}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
          <Heart className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">No saved jobs</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Jobs you save will appear here so you can easily find them later.</p>
          <Button asChild size="lg">
            <Link to="/jobs">Browse Jobs</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default SavedJobsPage;
