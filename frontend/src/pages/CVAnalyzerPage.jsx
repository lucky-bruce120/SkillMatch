import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import {
  UploadCloud, FileText, X, Loader2, Sparkles, History, ArrowRight, Briefcase,
  MapPin, DollarSign, Bookmark, BookmarkCheck, AlertCircle, CheckCircle2, Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

const CVAnalyzerPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const records = await apiServerClient.fetch('/cv?limit=5', {
          headers: { Authorization: `Bearer ${currentUser?.token}` }
        });
        setHistory(records);
      } catch (error) {
        console.error("Failed to fetch history", error);
      }
    };
    
    const fetchSavedJobs = async () => {
      try {
        const saved = await apiServerClient.fetch('/saved-jobs', {
          headers: { Authorization: `Bearer ${currentUser?.token}` }
        });
        setSavedJobIds(new Set(saved.map(s => s.job_id)));
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
      }
    };

    if (currentUser) {
      fetchHistory();
      fetchSavedJobs();
    }
  }, [currentUser]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Declared in dependency order: each helper is defined before anything that
  // calls it, so there is no risk of a temporal-dead-zone ReferenceError.
  const fetchJobRecommendations = async (skills) => {
    try {
      const response = await apiServerClient.fetch('/job-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({ skills }),
      });

      // The endpoint returns { recommendations, ... }; it used to return a
      // bare array, so handle both shapes.
      setRecommendedJobs(Array.isArray(response) ? response : response.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch job recommendations:', error);
    } finally {
      setIsAnalyzing(false);
      setProgress(100);
    }
  };

  const handleAnalyze = async (fileToAnalyze) => {
    if (!fileToAnalyze) return;

    setIsAnalyzing(true);
    setProgress(10);
    setAnalysisError('');

    try {
      const formData = new FormData();
      formData.append('cv', fileToAnalyze);

      setProgress(40);
      const data = await apiServerClient.fetch('/cv-upload-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentUser?.token}` },
        body: formData,
      });

      setProgress(75);
      setAnalysisResult(data);
      setHistory((prev) => [
        {
          id: data.id,
          created: data.created,
          cv_file: fileToAnalyze.name,
          cv_score: data.cvScore,
        },
        ...prev.slice(0, 4),
      ]);

      // The analyse endpoint already returns CV-derived recommendations, so
      // there is no second round trip. Only fall back to the standalone
      // endpoint if that list came back empty.
      if (data.recommendations?.length) {
        setRecommendedJobs(data.recommendations);
        setProgress(100);
        setIsAnalyzing(false);
        toast.success('CV analysed successfully');
        return;
      }

      setProgress(85);
      await fetchJobRecommendations(data.extractedSkills);
      toast.success('CV analysed successfully');
    } catch (error) {
      console.error('CV Analysis error:', error);
      // Surface the server's actual reason rather than a generic message:
      // "unsupported format" and "AI unavailable" need different fixes.
      const message =
        error.body?.error || error.message || 'Failed to analyze CV. Please try again.';
      setAnalysisError(message);
      toast.error(message);
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const validExtension = /\.(pdf|docx|txt|md)$/i.test(selectedFile.name || '');

    if (!validTypes.includes(selectedFile.type) && !validExtension) {
      toast.error('Unsupported file type. Please upload a PDF, DOCX or TXT file.');
      return;
    }

    // 20MB. This was previously `20 * 1024 / 1024`, which evaluates to 0.0195
    // and therefore rejected every file over 19 bytes.
    const MAX_BYTES = 20 * 1024 * 1024;
    if (selectedFile.size > MAX_BYTES) {
      toast.error(`File is too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum is 20MB.`);
      return;
    }

    setFile(selectedFile);
    setAnalysisResult(null);
    setRecommendedJobs([]);
    handleAnalyze(selectedFile); // Auto-trigger analysis
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const toggleSaveJob = async (jobId) => {
    try {
      if (savedJobIds.has(jobId)) {
        await apiServerClient.fetch(`/saved-jobs/${jobId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${currentUser?.token}` }
        });
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        toast.success("Job removed from saved list");
      } else {
        await apiServerClient.fetch('/saved-jobs', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentUser?.token}` },
          body: JSON.stringify({ job_id: jobId })
        });
        setSavedJobIds(prev => new Set(prev).add(jobId));
        toast.success("Job saved successfully");
      }
    } catch (error) {
      toast.error("Failed to update saved status");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 text-primary">
          <Sparkles size={32} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">AI CV Analyzer</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Upload your resume to get instant feedback, discover missing skills, and receive personalized job recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <Card className="lg:col-span-2 border-2 shadow-sm">
          <CardContent className="p-8">
            {!file ? (
              <div 
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer ${
                  isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf,.docx,.txt,.md"
                />
                <UploadCloud className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
                <h3 className="text-xl font-semibold mb-2">Click or drag and drop to upload</h3>
                <p className="text-muted-foreground mb-6">PDF, DOCX or TXT (Max 20MB)</p>
                <Button variant="secondary">Select File</Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 border rounded-xl bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-background rounded-lg shadow-sm">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-lg line-clamp-1">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setFile(null); setAnalysisResult(null); setRecommendedJobs([]); }} disabled={isAnalyzing} className="text-muted-foreground hover:text-destructive">
                    <X size={20} />
                  </Button>
                </div>

                {isAnalyzing && (
                  <div className="space-y-3 p-6 border rounded-xl bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-3 text-primary font-medium">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing your CV...
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">Extracting skills and matching with top jobs.</p>
                  </div>
                )}

                {analysisError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {analysisError}
                      <button
                        type="button"
                        onClick={() => handleAnalyze(file)}
                        className="ml-2 underline font-medium"
                      >
                        Try again
                      </button>
                    </AlertDescription>
                  </Alert>
                )}

                {analysisResult && !isAnalyzing && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-sm text-muted-foreground mb-1">CV Score</p>
                        <p className="text-3xl font-bold text-primary">{analysisResult.cvScore}%</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl border">
                        <p className="text-sm text-muted-foreground mb-1">Skills Found</p>
                        <p className="text-3xl font-bold">{analysisResult.extractedSkills?.length || 0}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl border">
                        <p className="text-sm text-muted-foreground mb-1">Missing Skills</p>
                        <p className="text-3xl font-bold text-destructive">
                          {analysisResult.missingSkills?.length || 0}
                        </p>
                      </div>
                    </div>

                    {analysisResult.summary && (
                      <div className="p-4 rounded-xl bg-muted/30 border">
                        <p className="text-sm leading-relaxed">{analysisResult.summary}</p>
                      </div>
                    )}

                    {/* Discovered strengths */}
                    {analysisResult.strengths?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> What is working
                        </p>
                        <ul className="space-y-1.5">
                          {analysisResult.strengths.map((strength, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-emerald-500">+</span> {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Missing skills, each with a reason and priority */}
                    {analysisResult.missingSkills?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" /> Missing skills to add
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 text-xs"
                          >
                            <Link
                              to={`/courses?skills=${encodeURIComponent(
                                analysisResult.missingSkills.map((entry) => entry.skill).join(',')
                              )}`}
                            >
                              Find courses <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>

                        <ul className="space-y-2">
                          {analysisResult.missingSkills.map((entry, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-3 p-3 rounded-lg border bg-destructive/5"
                            >
                              <Badge
                                variant="outline"
                                className="shrink-0 border-destructive/30 text-destructive"
                              >
                                {entry.skill}
                              </Badge>
                              <div className="min-w-0">
                                {entry.priority && (
                                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                    {entry.priority} priority
                                  </p>
                                )}
                                {entry.why && (
                                  <p className="text-xs text-muted-foreground">{entry.why}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Top action items */}
                    {analysisResult.actionItems?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary" /> Do these first
                        </p>
                        <ol className="space-y-2">
                          {analysisResult.actionItems.slice(0, 4).map((item, index) => (
                            <li key={index} className="flex gap-3 text-sm">
                              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <Button className="w-full" variant="outline" onClick={() => navigate(`/cv-analysis/${analysisResult.id}`)}>
                      View Full Analysis Report <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-none shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" /> Recent Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map(record => (
                  <div key={record.id} className="p-4 bg-background rounded-lg border shadow-sm hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/cv-analysis/${record.id}`)}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-sm line-clamp-1" title={record.cv_file}>{record.cv_file || 'Resume'}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${record.cv_score >= 80 ? 'bg-green-100 text-green-700' : record.cv_score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {record.cv_score}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{new Date(record.created).toLocaleDateString()}</span>
                      <span className="flex items-center text-primary">View <ArrowRight className="ml-1 h-3 w-3" /></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No previous analyses found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Recommendations Section */}
      {recommendedJobs.length > 0 && (
        <div className="space-y-6 animate-in fade-in duration-700">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Recommended Jobs</h2>
              <p className="text-muted-foreground">Based on your CV analysis</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary text-sm px-3 py-1">
              <Sparkles className="mr-1 h-4 w-4" /> {recommendedJobs.length} Matches
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendedJobs.map(job => (
              <Card key={job.id} className="hover:shadow-md transition-all border-muted/60 hover:border-primary/30 flex flex-col h-full">
                <CardContent className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{job.title}</h3>
                      <p className="text-muted-foreground font-medium">{job.company}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                      {job.matchScore}% Match
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><MapPin size={14} /> {job.location} ({job.remoteType})</span>
                    <span className="flex items-center gap-1"><Briefcase size={14} /> {job.jobType}</span>
                    {(job.salaryMin || job.salaryMax) && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign size={14} /> 
                        {job.salaryMin ? `${job.salaryMin/1000}k` : ''} {job.salaryMax ? `- ${job.salaryMax/1000}k` : ''}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
                </CardContent>
                <CardFooter className="p-6 pt-0 mt-auto flex gap-3">
                  <Button className="flex-1" asChild>
                    <Link to={`/apply/${job.id}`}>Apply Now</Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => toggleSaveJob(job.id)}
                    className={savedJobIds.has(job.id) ? "text-primary border-primary bg-primary/5" : ""}
                  >
                    {savedJobIds.has(job.id) ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CVAnalyzerPage;
