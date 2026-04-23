import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { UploadCloud, FileText, X, Loader2, Sparkles, History, ArrowRight, Briefcase, MapPin, DollarSign, Bookmark, BookmarkCheck } from 'lucide-react';
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const records = await pb.collection('cv_analysis').getList(1, 5, {
          filter: `user_id="${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });
        setHistory(records.items);
      } catch (error) {
        console.error("Failed to fetch history", error);
      }
    };
    
    const fetchSavedJobs = async () => {
      try {
        const saved = await pb.collection('saved_jobs').getFullList({
          filter: `job_seeker_id="${currentUser.id}"`,
          $autoCancel: false
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

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 20MB.");
      return;
    }

    setFile(selectedFile);
    setAnalysisResult(null);
    setRecommendedJobs([]);
    handleAnalyze(selectedFile); // Auto-trigger analysis
  };

  const handleAnalyze = async (fileToAnalyze) => {
    if (!fileToAnalyze) return;

    setIsAnalyzing(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('cv', fileToAnalyze);
      
      setProgress(40);
      const response = await apiServerClient.fetch('/cv-upload-analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      setProgress(70);
      const data = await response.json();
      
      // Save to PocketBase
      setProgress(80);
      const analysisRecord = await pb.collection('cv_analysis').create({
        user_id: currentUser.id,
        file_name: fileToAnalyze.name,
        extracted_skills: JSON.stringify(data.extractedSkills),
        cv_score: data.cvScore,
        missing_skills: JSON.stringify(data.skillGaps),
        suggestions: JSON.stringify(data.suggestions)
      }, { $autoCancel: false });

      setAnalysisResult({ ...data, id: analysisRecord.id });
      setProgress(90);
      toast.success("CV analyzed successfully!");

      // Fetch Job Recommendations
      fetchJobRecommendations(data.extractedSkills);

    } catch (error) {
      console.error("CV Analysis error:", error);
      toast.error("Failed to analyze CV. Please try again.");
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const fetchJobRecommendations = async (skills) => {
    try {
      const response = await apiServerClient.fetch('/job-recommendations-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills })
      });
      
      if (response.ok) {
        const jobs = await response.json();
        setRecommendedJobs(jobs);
      }
    } catch (error) {
      console.error("Failed to fetch job recommendations:", error);
    } finally {
      setIsAnalyzing(false);
      setProgress(100);
    }
  };

  const toggleSaveJob = async (jobId) => {
    try {
      if (savedJobIds.has(jobId)) {
        const saved = await pb.collection('saved_jobs').getFirstListItem(`job_seeker_id="${currentUser.id}" && job_id="${jobId}"`, { $autoCancel: false });
        await pb.collection('saved_jobs').delete(saved.id, { $autoCancel: false });
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        toast.success("Job removed from saved list");
      } else {
        await pb.collection('saved_jobs').create({
          job_seeker_id: currentUser.id,
          job_id: jobId
        }, { $autoCancel: false });
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
                  accept=".pdf,.doc,.docx,.txt"
                />
                <UploadCloud className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
                <h3 className="text-xl font-semibold mb-2">Click or drag and drop to upload</h3>
                <p className="text-muted-foreground mb-6">PDF, DOC, DOCX, or TXT (Max 20MB)</p>
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

                {analysisResult && !isAnalyzing && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-sm text-muted-foreground mb-1">CV Score</p>
                        <p className="text-3xl font-bold text-primary">{analysisResult.cvScore}%</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl border">
                        <p className="text-sm text-muted-foreground mb-1">Skills Found</p>
                        <p className="text-3xl font-bold">{analysisResult.extractedSkills?.length || 0}</p>
                      </div>
                    </div>
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
                      <p className="font-medium text-sm line-clamp-1" title={record.file_name}>{record.file_name || 'Resume'}</p>
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
