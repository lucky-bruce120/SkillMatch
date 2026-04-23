import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

import apiServerClient from '@/lib/apiServerClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, FileText, UploadCloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ApplicationWorkflowPage = () => {
  const { jobId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    coverLetter: '',
    cvSource: 'profile' // 'profile' or 'new'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job data
        const jobResponse = await apiServerClient.fetch(`/jobs/${jobId}`);
        if (jobResponse.ok) {
          const jobData = await jobResponse.json();
          setJob(jobData);
        } else {
          throw new Error('Job not found');
        }

        // Fetch profile data
        try {
          const profileResponse = await apiServerClient.fetch('/profile', {
            headers: { 'Authorization': `Bearer ${currentUser?.token}` }
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setProfile(profileData);
          }
        } catch (e) {
          // Profile might not exist yet
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load job details");
        navigate('/jobs');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) fetchData();
  }, [jobId, currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.cvSource === 'profile' && !profile?.cv_file) {
      toast.error("No CV found in your profile. Please upload one.");
      return;
    }

    setSubmitting(true);
    try {
      // Call backend endpoint
      const response = await apiServerClient.fetch('/apply-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobSeekerId: currentUser.id,
          coverLetter: formData.coverLetter,
          cvFileId: profile?.cv_file || 'uploaded_file' // Simplified for this implementation
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Application failed');

      setSuccess(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error("Application error:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-3xl font-bold mb-4">Application Submitted!</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your application for <strong>{job?.title}</strong> at <strong>{job?.company}</strong> has been sent successfully. The employer will review your profile and get back to you.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild variant="outline"><Link to="/jobs">Browse More Jobs</Link></Button>
          <Button asChild><Link to="/applications">Track Application</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
        <Link to={`/jobs`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs</Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Submit Application</h1>
        <p className="text-muted-foreground">Review your details and submit your application.</p>
      </div>

      <Card className="mb-6 bg-muted/30 border-none">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-1">{job?.title}</h3>
          <p className="text-muted-foreground font-medium">{job?.company} â€¢ {job?.location}</p>
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Resume / CV *</Label>
              <Select value={formData.cvSource} onValueChange={(v) => setFormData({...formData, cvSource: v})}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">Use CV from Profile</SelectItem>
                  <SelectItem value="new">Upload New CV</SelectItem>
                </SelectContent>
              </Select>

              {formData.cvSource === 'profile' ? (
                <div className="p-4 border rounded-lg bg-muted/20 flex items-center gap-3">
                  <FileText className="text-primary h-6 w-6" />
                  <div>
                    <p className="font-medium text-sm">{profile?.cv_file ? 'Profile CV Attached' : 'No CV found in profile'}</p>
                    {!profile?.cv_file && <p className="text-xs text-destructive mt-1">Please update your profile or upload a new CV.</p>}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to upload a new CV</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 10MB</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="coverLetter" className="text-base">Cover Letter / Note to Employer</Label>
              <Textarea 
                id="coverLetter" 
                rows={6} 
                placeholder="Explain why you're a great fit for this role..."
                value={formData.coverLetter}
                onChange={(e) => setFormData({...formData, coverLetter: e.target.value})}
                className="resize-none"
              />
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-0 bg-muted/10 border-t flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" size="lg" disabled={submitting || (formData.cvSource === 'profile' && !profile?.cv_file)}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Application'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ApplicationWorkflowPage;
