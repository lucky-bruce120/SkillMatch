import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MapPin, DollarSign, Briefcase, Clock, Building2, ArrowLeft, Heart, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const JobDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const jobData = await apiServerClient.fetch(`/jobs/${id}`);
        setJob(jobData);

        if (currentUser) {
          // Check if saved
          try {
            await apiServerClient.fetch(`/saved-jobs/check?job_id=${id}`);
            setIsSaved(true);
          } catch (e) { setIsSaved(false); }

          // Check if applied
          try {
            await apiServerClient.fetch(`/applications/check?job_id=${id}`);
            setHasApplied(true);
          } catch (e) { setHasApplied(false); }
        }
      } catch (error) {
        console.error("Error fetching job:", error);
        toast.error("Job not found");
        navigate('/jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [id, currentUser, navigate]);

  const handleSave = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: `/job/${id}` } } });
      return;
    }

    try {
      if (isSaved) {
        await apiServerClient.fetch(`/saved-jobs?job_id=${id}`, {
          method: 'DELETE'
        });
        setIsSaved(false);
        toast.success("Removed from saved jobs");
      } else {
        await apiServerClient.fetch('/saved-jobs', {
          method: 'POST',
          body: JSON.stringify({ job_id: id })
        });
        setIsSaved(true);
        toast.success("Job saved successfully");
      }
    } catch (error) {
      toast.error("Failed to update saved status");
    }
  };

  const handleApply = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: `/job/${id}` } } });
      return;
    }
    setApplyModalOpen(true);
  };

  const submitApplication = async () => {
    setApplying(true);
    try {
      await apiServerClient.fetch('/apply-job', {
        method: 'POST',
        body: JSON.stringify({
          jobId: id,
          coverLetter: coverLetter
        })
      });

      setHasApplied(true);
      setApplyModalOpen(false);
      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error("Application error:", error);
      toast.error("Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
        <Link to="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs</Link>
      </Button>

      <div className="bg-card border rounded-2xl p-6 md:p-10 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{job.title}</h1>
            <div className="flex items-center text-xl text-muted-foreground gap-2">
              <Building2 size={24} />
              <span>{job.company}</span>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              size="icon" 
              className={`h-12 w-12 shrink-0 ${isSaved ? 'text-destructive border-destructive hover:bg-destructive/10' : ''}`}
              onClick={handleSave}
            >
              <Heart className={isSaved ? "fill-current" : ""} />
            </Button>
            {hasApplied ? (
              <Button className="h-12 px-8 flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white" disabled>
                <CheckCircle2 className="mr-2 h-5 w-5" /> Applied
              </Button>
            ) : (
              <Button className="h-12 px-8 flex-1 md:flex-none text-base" onClick={handleApply}>
                Apply Now
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y mb-8">
          <div className="space-y-1">
            <div className="flex items-center text-muted-foreground text-sm gap-1.5">
              <MapPin size={16} /> Location
            </div>
            <p className="font-medium">{job.location} ({job.remote_type})</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-muted-foreground text-sm gap-1.5">
              <DollarSign size={16} /> Salary
            </div>
            <p className="font-medium">${job.salary_min?.toLocaleString()} - ${job.salary_max?.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-muted-foreground text-sm gap-1.5">
              <Briefcase size={16} /> Job Type
            </div>
            <p className="font-medium">{job.job_type}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-muted-foreground text-sm gap-1.5">
              <Clock size={16} /> Experience
            </div>
            <p className="font-medium">{job.experience_level}</p>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">About the role</h2>
            <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {job.description}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.required_skills?.split(',').map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-3">
                  {skill.trim()}
                </Badge>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Application Modal */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
            <DialogDescription>
              Your profile information will be sent to {job.company}. You can optionally include a cover letter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
              <Textarea 
                id="coverLetter" 
                placeholder="Why are you a great fit for this role?" 
                className="min-h-[150px]"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyModalOpen(false)}>Cancel</Button>
            <Button onClick={submitApplication} disabled={applying}>
              {applying ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetailsPage;
