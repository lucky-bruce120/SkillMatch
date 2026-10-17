import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Briefcase, Clock, DollarSign, Target, ChevronRight, Star, TrendingUp,
  CheckCircle2, Circle, Sparkles, UserCog, BookOpen, ArrowRight, RefreshCw,
} from 'lucide-react';

const CONFIDENCE_STYLES = {
  high: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const CareerPathPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setData(await apiServerClient.fetch('/career-path'));
    } catch (err) {
      setError(err.body?.error || 'We could not build your career path. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="space-y-6">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const paths = data?.paths || [];
  const focusSkills = data?.focusSkills || [];

  // Nothing to personalise from yet - point at the one action that unlocks it.
  if (data?.needsProfile) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Career Path Explorer</h1>
          <p className="text-muted-foreground text-lg">
            We map your next moves from your own skills and the roles employers are hiring for.
          </p>
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-8 text-center space-y-5">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <UserCog className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">We need your skills first</h2>
              <p className="text-muted-foreground">
                {data.message ||
                  'Add a few skills to your profile and this page will build a progression plan from your current level upwards.'}
              </p>
            </div>

            {focusSkills.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Skills currently in demand on SkillMatch</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {focusSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/profile">Add your skills <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/jobs">Browse open roles</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Career Path Explorer</h1>
          <p className="text-muted-foreground text-lg">{data?.headline}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Rebuild
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Could not load your career path</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            {data?.currentRole && (
              <Badge variant="outline" className="gap-1.5 py-1">
                <Briefcase className="h-3.5 w-3.5" /> {data.currentRole}
              </Badge>
            )}
            {data?.level && (
              <Badge variant="outline" className="gap-1.5 py-1">
                <TrendingUp className="h-3.5 w-3.5" /> {data.level}
              </Badge>
            )}
            {typeof data?.yearsExperience === 'number' && (
              <Badge variant="outline" className="gap-1.5 py-1">
                <Clock className="h-3.5 w-3.5" /> {data.yearsExperience} years experience
              </Badge>
            )}
            {data?.hasCv && (
              <Badge variant="outline" className="gap-1.5 py-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> CV analysed
              </Badge>
            )}
          </div>

          {data?.summary && <p className="text-muted-foreground leading-relaxed">{data.summary}</p>}

          {!data?.aiGenerated && (
            <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Built from your profile and live market data. AI guidance was unavailable, so this is the
              generated fallback.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Focus skills */}
      {focusSkills.length > 0 && (
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Learn these next
            </CardTitle>
            <CardDescription>
              In demand with employers right now, and missing from your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {focusSkills.map((skill) => (
              <Link key={skill} to={`/courses?skills=${encodeURIComponent(skill)}`}>
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors py-1.5">
                  {skill}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* The ladder */}
      {paths.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            We could not work out a path from your profile yet. Add more skills and try again.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-primary/20 before:to-transparent">
          {paths.map((path, index) => (
            <div
              key={path.id}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                {index === 0 ? <Star size={20} /> : <Target size={20} />}
              </div>

              <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] hover:shadow-xl transition-all duration-300 border-muted/50 hover:border-primary/30">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary" className="gap-1.5">
                      <Briefcase size={13} /> Step {path.step}
                    </Badge>
                    <Badge variant="outline" className={CONFIDENCE_STYLES[path.confidence]}>
                      {path.confidence} confidence
                    </Badge>
                  </div>

                  <h3 className="text-2xl font-bold mb-3">{path.targetRole}</h3>

                  {path.why && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">{path.why}</p>
                  )}

                  <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-muted/30 rounded-xl">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Timeline</p>
                      <div className="flex items-center gap-2 font-medium">
                        <Clock size={16} className="text-primary shrink-0" />
                        <span>{path.timeline}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                        Est. salary
                      </p>
                      <div className="flex items-center gap-2 font-medium">
                        <DollarSign size={16} className="text-green-600 shrink-0" />
                        {/* The local fallback has no salary data, so hide the row
                            rather than rendering an empty column. */}
                        <span>{path.salaryRange || 'Varies'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills, split by whether the candidate already has them */}
                  {path.requiredSkills?.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Skills for this step
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {path.requiredSkills.map(({ skill, have }) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className={
                              have
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }
                          >
                            {have ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Circle className="h-3 w-3 mr-1" />}
                            {skill}
                            <span className="ml-1 opacity-70">{have ? 'have' : 'learn'}</span>
                          </Badge>
                        ))}
                      </div>
                      {path.gapSkills?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {path.gapSkills.length} skill{path.gapSkills.length === 1 ? '' : 's'} to add to your profile.
                        </p>
                      )}
                    </div>
                  )}

                  {path.actionSteps?.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        What to do
                      </p>
                      <ol className="space-y-2">
                        {path.actionSteps.map((step, stepIndex) => (
                          <li key={stepIndex} className="flex gap-3 text-sm">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                              {stepIndex + 1}
                            </span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button className="flex-1 group-hover:bg-primary/90 transition-colors" asChild>
                      <Link to={`/courses?skills=${encodeURIComponent(path.gapSkills?.join(', ') || '')}`}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Courses for this step
                      </Link>
                    </Button>

                    {/* Only link to a job when one of the candidate's own matches
                        was attached to this path. */}
                    {path.jobIds?.length > 0 && (
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to={`/job/${path.jobIds[0]}`}>
                          Matching roles ({path.jobIds.length})
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareerPathPage;
