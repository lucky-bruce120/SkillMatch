import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ArrowRight, Target, TrendingUp, Clock } from 'lucide-react';

const SkillGapAnalysisPage = () => {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [userSkills, setUserSkills] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const skillsData = await pb.collection('skills').getFullList({
          filter: `job_seeker_id="${currentUser.id}"`,
          $autoCancel: false
        });
        setUserSkills(skillsData.map(s => ({ name: s.skill_name.toLowerCase(), level: s.proficiency_level })));

        const jobsData = await pb.collection('jobs').getList(1, 20, {
          sort: '-created',
          $autoCancel: false
        });
        setJobs(jobsData.items);
        
        if (jobsData.items.length > 0) {
          setSelectedJobId(jobsData.items[0].id);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedJobId) return;

    const job = jobs.find(j => j.id === selectedJobId);
    if (!job || !job.required_skills) return;

    const requiredSkills = job.required_skills.split(',').map(s => s.trim());
    
    const matched = [];
    const missing = [];

    requiredSkills.forEach(reqSkill => {
      const userSkill = userSkills.find(us => reqSkill.toLowerCase().includes(us.name) || us.name.includes(reqSkill.toLowerCase()));
      if (userSkill) {
        matched.push({ name: reqSkill, userLevel: userSkill.level });
      } else {
        missing.push({ name: reqSkill, estimatedTime: '2-4 weeks', demand: 'High' });
      }
    });

    setAnalysis({
      jobTitle: job.title,
      company: job.company,
      matched,
      missing,
      matchPercentage: Math.round((matched.length / requiredSkills.length) * 100) || 0
    });

  }, [selectedJobId, jobs, userSkills]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Skill Gap Analysis</h1>
        <p className="text-muted-foreground">Compare your current skills against specific job requirements to identify learning opportunities.</p>
      </div>

      <Card className="mb-8 border-primary/20 shadow-sm">
        <CardContent className="p-6">
          <label className="block text-sm font-medium mb-2">Select a Target Job</label>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select a job to analyze" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map(job => (
                <SelectItem key={job.id} value={job.id}>{job.title} at {job.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b bg-muted/10">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">Analysis for {analysis.jobTitle}</CardTitle>
                  <CardDescription className="text-base">{analysis.company}</CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${analysis.matchPercentage >= 80 ? 'text-green-600' : analysis.matchPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {analysis.matchPercentage}%
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Match Score</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                <div className="p-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
                    <CheckCircle2 className="text-green-500" /> Acquired Skills ({analysis.matched.length})
                  </h3>
                  {analysis.matched.length > 0 ? (
                    <div className="space-y-4">
                      {analysis.matched.map((skill, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                          <span className="font-medium">{skill.name}</span>
                          <Badge variant="outline" className="bg-background">{skill.userLevel}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No matching skills found.</p>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
                    <XCircle className="text-destructive" /> Missing Skills ({analysis.missing.length})
                  </h3>
                  {analysis.missing.length > 0 ? (
                    <div className="space-y-4">
                      {analysis.missing.map((skill, idx) => (
                        <div key={idx} className="flex flex-col p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{skill.name}</span>
                            <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none">Required</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock size={12} /> Est. {skill.estimatedTime}</span>
                            <span className="flex items-center gap-1"><TrendingUp size={12} /> {skill.demand} Demand</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">You have all the required skills!</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {analysis.missing.length > 0 && (
            <Card className="bg-primary text-primary-foreground overflow-hidden relative">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-2xl">
                    <Target size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl mb-1">Close the Gap</h3>
                    <p className="text-primary-foreground/80">Take targeted courses to learn your missing skills and increase your match score to 100%.</p>
                  </div>
                </div>
                <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto shrink-0 h-14 px-8 text-lg">
                  <Link to={`/courses?skills=${analysis.missing.map(m => m.name).join(',')}`}>
                    Find Courses <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillGapAnalysisPage;
