import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, Map, CheckCircle2, AlertCircle, AlertTriangle, Download, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const CircularProgress = ({ value, size = 120, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (val) => {
    if (val >= 80) return 'text-green-500';
    if (val >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-muted stroke-current"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
        />
        <circle
          className={`${getColor(value)} stroke-current transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

const CVAnalysisResultsPage = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const record = await apiServerClient.fetch(`/cv/${id}`, {
          headers: { Authorization: `Bearer ${currentUser?.token}` }
        });
        setAnalysis(record);
      } catch (error) {
        console.error('Error fetching analysis:', error);
        toast.error('Failed to load analysis results');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.token) {
      fetchAnalysis();
    }
  }, [id, currentUser]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full md:col-span-1" />
          <Skeleton className="h-64 w-full md:col-span-2" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!analysis) return <div className="container mx-auto py-12 text-center">Analysis not found.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
        <Link to="/cv-analyzer"><ArrowLeft className="mr-2 h-4 w-4" /> Analyze Another CV</Link>
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CV Analysis Results</h1>
          <p className="text-muted-foreground mt-1">Generated on {new Date(analysis.created).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-1 flex flex-col items-center justify-center p-6 text-center">
          <h3 className="font-semibold text-lg mb-6">Overall Resume Score</h3>
          <CircularProgress value={analysis.cv_score || 0} size={160} strokeWidth={12} />
          <p className="text-sm text-muted-foreground mt-6">
            {analysis.cv_score >= 80 ? 'Excellent! Your resume is highly competitive.' :
             analysis.cv_score >= 60 ? "Good, but there's room for improvement." :
             'Needs significant updates to pass ATS systems.'}
          </p>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="text-yellow-500" /> Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {analysis.analysis_text || 'Your resume has been analyzed against industry standards. Review the extracted skills and suggestions below to improve your chances of landing interviews.'}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild>
                <Link to={`/courses?skills=${encodeURIComponent(
                  // `missing_skills` is an array of objects on newer analyses
                  // and plain strings on older ones.
                  (analysis.missing_skills || [])
                    .map((entry) => (typeof entry === 'string' ? entry : entry.skill))
                    .filter(Boolean)
                    .join(',')
                )}`}>
                  <BookOpen className="mr-2 h-4 w-4" /> Get Course Recommendations
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link to="/career-path">
                  <Map className="mr-2 h-4 w-4" /> View Career Path
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-green-500" /> Skills Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.extracted_skills && analysis.extracted_skills.length > 0 ? (
                analysis.extracted_skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">No specific skills detected.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-destructive" /> Missing Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.missing_skills && analysis.missing_skills.length > 0 ? (
              <ul className="space-y-3">
                {analysis.missing_skills.map((entry, idx) => {
                  // Newer analyses store objects with a reason and priority;
                  // older ones hold plain strings.
                  const isLegacy = typeof entry === 'string';
                  const skill = isLegacy ? entry : entry.skill;
                  const why = isLegacy ? '' : entry.why;
                  const priority = isLegacy ? null : entry.priority;

                  return (
                    <li key={idx} className="flex items-start gap-3">
                      <Badge
                        variant="outline"
                        className="shrink-0 border-destructive/30 text-destructive bg-destructive/5"
                      >
                        {skill}
                      </Badge>
                      <div className="min-w-0">
                        {priority && (
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            {priority} priority
                          </p>
                        )}
                        {why && <p className="text-sm text-muted-foreground">{why}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                No gaps found against the skills employers are currently asking for.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score breakdown */}
      {analysis.score_breakdown && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Score breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              ['Impact', analysis.score_breakdown.impact],
              ['Clarity', analysis.score_breakdown.clarity],
              ['Completeness', analysis.score_breakdown.completeness],
              ['Skills coverage', analysis.score_breakdown.skillsCoverage],
              ['ATS readability', analysis.score_breakdown.atsReadability],
            ]
              .filter(([, value]) => typeof value === 'number')
              .map(([label, value]) => (
                <div key={label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold">{value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {analysis.strengths?.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> What is working
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                  {strength}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ATS warnings */}
      {analysis.ats_warnings?.length > 0 && (
        <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" /> Applicant tracking warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.ats_warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Actionable Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.suggestions && analysis.suggestions.length > 0 ? (
            <ul className="space-y-4">
              {analysis.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-foreground leading-relaxed">{suggestion}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No specific suggestions at this time.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CVAnalysisResultsPage;
