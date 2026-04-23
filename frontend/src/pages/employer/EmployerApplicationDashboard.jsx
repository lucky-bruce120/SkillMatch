import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';

import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Sparkles, Check, X, Download, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

const statusLabel = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const EmployerApplicationDashboard = () => {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const [selectedApp, setSelectedApp] = useState(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ status: '', feedback: '' });
  const [processing, setProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [currentUser]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const applicationsData = await apiServerClient.fetch('/employer/applications', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      setApplications(applicationsData);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCV = async (app) => {
    setProcessing(true);
    try {
      const data = await apiServerClient.fetch('/analyze-candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          applicationId: app._id || app.id
        })
      });
      if (data.success) {
        setAnalysisResult(data.analysis);
        toast.success("CV Analyzed successfully");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Failed to analyze CV");
    } finally {
      setProcessing(false);
    }
  };

  const openFeedbackModal = (app, status) => {
    setSelectedApp(app);
    setFeedbackData({ status, feedback: '' });
    setFeedbackModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    setProcessing(true);
    try {
      const normalizedStatus = feedbackData.status.toLowerCase() === 'approved'
        ? 'accepted'
        : feedbackData.status.toLowerCase() === 'applied'
          ? 'pending'
          : feedbackData.status.toLowerCase();

      const data = await apiServerClient.fetch('/application-response', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          applicationId: selectedApp._id,
          status: normalizedStatus,
          feedback: feedbackData.feedback
        })
      });
      if (data.success) {
        setApplications(apps => apps.map(a => a._id === selectedApp._id ? { ...a, status: normalizedStatus, feedback: feedbackData.feedback } : a));
        setSelectedApp((app) => app ? { ...app, status: normalizedStatus, feedback: feedbackData.feedback } : app);
        toast.success(`Application marked as ${normalizedStatus}`);
        setFeedbackModalOpen(false);
        setSelectedApp(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setProcessing(false);
    }
  };

  const filteredApps = filter === 'all' ? applications : applications.filter(a => a.status?.toLowerCase() === filter.toLowerCase());

  if (loading) {
    return <div className="container mx-auto px-4 py-8"><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Dashboard</h1>
          <p className="text-muted-foreground mt-1">Review and manage candidates for your job postings.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            <SelectItem value="pending">New (Pending)</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
        <div className="lg:col-span-1 space-y-4 h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {filteredApps.length > 0 ? (
            filteredApps.map(app => (
              <Card 
                key={app._id} 
                className={`cursor-pointer transition-all hover:border-primary/50 ${selectedApp?._id === app._id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''}`}
                onClick={() => { setSelectedApp(app); setAnalysisResult(null); }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold truncate pr-2">{app.job_seeker_id?.email || 'Candidate'}</h4>
                    <Badge variant="outline" className={
                      app.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      app.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' :
                      app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }>{statusLabel[app.status] || app.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{app.job_id?.title}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(app.applied_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <p className="text-muted-foreground">No applications found.</p>
            </div>
          )}
        </div>

        {/* Application Details Panel */}
        <div className="lg:col-span-2">
          {selectedApp ? (
            <Card className="h-full border-muted shadow-sm">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl mb-1">{selectedApp.job_seeker_id?.email || 'Candidate Profile'}</CardTitle>
                    <CardDescription className="text-base">Applied for: <span className="font-medium text-foreground">{selectedApp.job_id?.title}</span></CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedApp.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200" onClick={() => openFeedbackModal(selectedApp, 'accepted')}>
                          <Check className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => openFeedbackModal(selectedApp, 'rejected')}>
                          <X className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-300px)]">
                
                {/* Cover Letter */}
                {selectedApp.cover_letter && (
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cover Letter</h4>
                    <div className="p-4 bg-muted/30 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedApp.cover_letter}
                    </div>
                  </div>
                )}

                {/* CV Actions */}
                <div className="flex flex-wrap gap-4 p-4 border rounded-xl bg-card">
                  {selectedApp.job_seeker_id?.profile?.cv ? (
                    <Button variant="secondary" className="flex-1" asChild>
                      <a href={`${apiServerClient.baseUrl}${selectedApp.job_seeker_id.profile.cv}`} target="_blank" rel="noreferrer">
                        <Download className="mr-2 h-4 w-4" /> Download CV
                      </a>
                    </Button>
                  ) : (
                    <Button variant="secondary" className="flex-1" disabled>
                      <Download className="mr-2 h-4 w-4" /> CV Unavailable
                    </Button>
                  )}
                  <Button className="flex-1" onClick={() => handleAnalyzeCV(selectedApp)} disabled={processing}>
                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    AI CV Analysis
                  </Button>
                </div>

                {/* AI Analysis Results */}
                {analysisResult && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Sparkles className="text-primary h-5 w-5" />
                      <h3 className="text-lg font-bold">AI Analysis Results</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-sm text-muted-foreground mb-1">Match Score</p>
                        <p className="text-3xl font-bold text-primary">{analysisResult.cv_score}%</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl border">
                        <p className="text-sm text-muted-foreground mb-1">Key Strengths</p>
                        <p className="font-medium">{analysisResult.skills?.slice(0,2).map(s=>s.name).join(', ')}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">Detected Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.skills?.map((s, i) => (
                          <Badge key={i} variant="secondary">{s.name} <span className="opacity-50 ml-1 text-[10px]">{s.proficiency}</span></Badge>
                        ))}
                      </div>
                    </div>

                    {analysisResult.gaps?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-destructive mb-2">Identified Gaps</h4>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          {analysisResult.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border rounded-xl bg-muted/10 border-dashed text-muted-foreground p-8">
              <Eye className="h-12 w-12 mb-4 opacity-20" />
              <p>Select an application from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as {feedbackData.status}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              You are about to mark this application as <strong>{feedbackData.status}</strong>. 
              You can optionally provide feedback to the candidate.
            </p>
            <Textarea 
              placeholder="Enter feedback or next steps (optional)..." 
              rows={4}
              value={feedbackData.feedback}
              onChange={(e) => setFeedbackData({...feedbackData, feedback: e.target.value})}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackModalOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={processing}>
              {processing ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployerApplicationDashboard;
