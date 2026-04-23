import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, MapPin, Briefcase, DollarSign, Bookmark, BookmarkCheck, Sparkles, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const JobListingsPage = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    remote: 'all'
  });

  useEffect(() => {
    fetchJobs();
    if (isAuthenticated && currentUser?.role === 'Job Seeker') {
      fetchSavedJobs();
    }
  }, [isAuthenticated, currentUser]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && currentUser?.role === 'Job Seeker') {
        // Fetch user skills for smart matching
        const skillsResponse = await apiServerClient.fetch('/profile/skills', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });

        let skillNames = [];
        if (skillsResponse.ok) {
          const skills = await skillsResponse.json();
          skillNames = skills.map(s => s.skill_name || s.name);
        }

        if (skillNames.length > 0) {
          // Use smart matching endpoint
          const response = await apiServerClient.fetch('/job-recommendations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentUser?.token}`
            },
            body: JSON.stringify({ userId: currentUser.id, skills: skillNames })
          });

          if (response.ok) {
            const jobs = await response.json();
            setJobs(jobs);
          } else {
            // Fallback to regular job search
            const searchResponse = await apiServerClient.fetch('/jobs/search');
            if (searchResponse.ok) {
              const jobs = await searchResponse.json();
              setJobs(jobs);
            }
          }
        } else {
          // No skills, use regular job search
          const searchResponse = await apiServerClient.fetch('/jobs/search');
          if (searchResponse.ok) {
            const jobs = await searchResponse.json();
            setJobs(jobs);
          }
        }
      } else {
        // Not authenticated or not a job seeker, show all jobs
        const searchResponse = await apiServerClient.fetch('/jobs/search');
        if (searchResponse.ok) {
          const jobs = await searchResponse.json();
          setJobs(jobs);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const response = await apiServerClient.fetch('/saved-jobs', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (response.ok) {
        const saved = await response.json();
        setSavedJobIds(new Set(saved.map(s => s.job_id)));
      }
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
    }
  };

  const toggleSaveJob = async (e, jobId) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (currentUser.role !== 'Job Seeker') return;

    try {
      if (savedJobIds.has(jobId)) {
        // Remove from saved jobs
        const response = await apiServerClient.fetch(`/saved-jobs/${jobId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });

        if (response.ok) {
          setSavedJobIds(prev => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
          toast.success("Job removed from saved list");
        }
      } else {
        // Add to saved jobs
        const response = await apiServerClient.fetch('/saved-jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify({ job_id: jobId })
        });

        if (response.ok) {
          setSavedJobIds(prev => new Set(prev).add(jobId));
          toast.success("Job saved successfully");
        }
      }
    } catch (error) {
      toast.error("Failed to update saved status");
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filters.type !== 'all' && job.job_type !== filters.type) return false;
    if (filters.remote !== 'all' && job.remote_type !== filters.remote) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      return job.title.toLowerCase().includes(s) || job.company.toLowerCase().includes(s) || job.location.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Find Your Next Role</h1>
        <p className="text-muted-foreground text-lg">
          {isAuthenticated && currentUser?.role === 'Job Seeker' 
            ? "We've matched these opportunities based on your profile skills." 
            : "Browse thousands of job openings from top companies."}
        </p>
      </div>

      <Card className="mb-8 shadow-sm border-muted">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Job title, company, or keywords..." 
              className="pl-10 h-12 text-base"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <Select value={filters.type} onValueChange={(v) => setFilters({...filters, type: v})}>
            <SelectTrigger className="w-full md:w-[180px] h-12">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Full-time">Full-time</SelectItem>
              <SelectItem value="Part-time">Part-time</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.remote} onValueChange={(v) => setFilters({...filters, remote: v})}>
            <SelectTrigger className="w-full md:w-[180px] h-12">
              <SelectValue placeholder="Work Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              <SelectItem value="Remote">Remote</SelectItem>
              <SelectItem value="On-site">On-site</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map(job => (
            <Card 
              key={job.id} 
              className="hover:shadow-md transition-all cursor-pointer border-muted/60 hover:border-primary/30 group"
              onClick={() => setSelectedJob(job)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center shrink-0 border">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{job.title}</h3>
                      <p className="text-muted-foreground font-medium mb-2">{job.company}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin size={14} /> {job.location} ({job.remote_type})</span>
                        <span className="flex items-center gap-1"><Briefcase size={14} /> {job.job_type}</span>
                        {(job.salary_min || job.salary_max) && (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <DollarSign size={14} /> 
                            {job.salary_min ? `${job.salary_min/1000}k` : ''} {job.salary_max ? `- ${job.salary_max/1000}k` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                    {job.match_score && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                        <Sparkles size={12} className="mr-1" /> {job.match_score}% Match
                      </Badge>
                    )}
                    <div className="flex gap-2">
                      {isAuthenticated && currentUser?.role === 'Job Seeker' && (
                        <Button variant="ghost" size="icon" onClick={(e) => toggleSaveJob(e, job.id)} className={savedJobIds.has(job.id) ? "text-primary" : "text-muted-foreground"}>
                          {savedJobIds.has(job.id) ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                        </Button>
                      )}
                      <Button onClick={(e) => { e.stopPropagation(); navigate(`/apply/${job.id}`); }}>Apply</Button>
                    </div>
                  </div>
                </div>
                
                {job.required_skills && (
                  <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                    {job.required_skills.split(',').slice(0, 5).map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="bg-muted/30 font-normal">{skill.trim()}</Badge>
                    ))}
                    {job.required_skills.split(',').length > 5 && <Badge variant="outline" className="bg-muted/30 font-normal">+{job.required_skills.split(',').length - 5} more</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
          <Briefcase className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">No jobs found</h3>
          <p className="text-muted-foreground mb-6">Try adjusting your search or filters to find more opportunities.</p>
          <Button variant="outline" onClick={() => setFilters({ search: '', type: 'all', remote: 'all' })}>Clear Filters</Button>
        </div>
      )}

      {/* Job Details Modal */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader className="mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-bold mb-1">{selectedJob.title}</DialogTitle>
                    <DialogDescription className="text-lg font-medium text-foreground">{selectedJob.company}</DialogDescription>
                  </div>
                  {selectedJob.match_score && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-sm px-3 py-1">
                      <Sparkles size={14} className="mr-1" /> {selectedJob.match_score}% Match
                    </Badge>
                  )}
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-xl">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Location</p>
                  <p className="font-medium text-sm">{selectedJob.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Work Model</p>
                  <p className="font-medium text-sm">{selectedJob.remote_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Job Type</p>
                  <p className="font-medium text-sm">{selectedJob.job_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Salary</p>
                  <p className="font-medium text-sm text-green-600">
                    {selectedJob.salary_min ? `$${selectedJob.salary_min/1000}k` : 'DOE'} {selectedJob.salary_max ? `- $${selectedJob.salary_max/1000}k` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-2">About the Role</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedJob.description}</p>
                </div>
                
                {selectedJob.required_skills && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.required_skills.split(',').map((skill, idx) => (
                        <Badge key={idx} variant="secondary">{skill.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-8 pt-4 border-t sm:justify-between">
                {isAuthenticated && currentUser?.role === 'Job Seeker' ? (
                  <Button variant="outline" onClick={(e) => toggleSaveJob(e, selectedJob.id)}>
                    {savedJobIds.has(selectedJob.id) ? <><BookmarkCheck className="mr-2 h-4 w-4" /> Saved</> : <><Bookmark className="mr-2 h-4 w-4" /> Save Job</>}
                  </Button>
                ) : <div />}
                <Button size="lg" onClick={() => navigate(`/apply/${selectedJob.id}`)}>Apply Now</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobListingsPage;
