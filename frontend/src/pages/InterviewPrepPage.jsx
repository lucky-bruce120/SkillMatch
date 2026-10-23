import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Lightbulb, MessageSquare, CheckSquare, Link as LinkIcon, Search,
  Sparkles, Target, AlertTriangle, Calendar, Timer, ArrowUpRight, RefreshCw, Brain, Send,
} from 'lucide-react';

const DIFFICULTY_STYLES = {
  easy: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  hard: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

const normaliseDifficulty = (value) => {
  const text = String(value || '').toLowerCase();
  return ['easy', 'medium', 'hard'].includes(text) ? text : null;
};

const InterviewPrepPage = () => {
  const [roles, setRoles] = useState([]);
  const [role, setRole] = useState('Software Engineer');

  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [completed, setCompleted] = useState(() => new Set());
  const [savingChecklist, setSavingChecklist] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAnswer, setShowAnswer] = useState(() => new Set());
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiGuidance, setAiGuidance] = useState(null);
  const [aiGuidanceLoading, setAiGuidanceLoading] = useState(false);

  // Roles come from the API so the list reflects what the database actually
  // holds, rather than five strings hardcoded in the component.
  useEffect(() => {
    let cancelled = false;

    apiServerClient
      .fetch('/interview-prep/roles')
      .then((result) => {
        if (cancelled) return;
        if (Array.isArray(result?.roles) && result.roles.length) setRoles(result.roles);
      })
      .catch(() => {
        // A hardcoded floor keeps the page usable if this request fails.
        if (!cancelled) setRoles(['Software Engineer', 'Data Scientist', 'Product Manager', 'UX Designer', 'Marketing']);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadPrep = useCallback(async (targetRole) => {
    setLoading(true);
    setError('');

    try {
      const result = await apiServerClient.fetch(`/interview-prep/${encodeURIComponent(targetRole)}`);
      setPrep(result);

      // Checklist state is per user and per role.
      try {
        const saved = await apiServerClient.fetch(
          `/interview-prep/${encodeURIComponent(targetRole)}/checklist`
        );
        setCompleted(new Set(saved?.completed || []));
      } catch {
        setCompleted(new Set());
      }
    } catch (err) {
      setError(err.body?.error || 'We could not load interview prep for that role.');
      setPrep(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrep(role);
  }, [role, loadPrep]);

  /** Optimistic tick, then persisted. Rolls back if the save fails. */
  const toggleChecklist = async (itemId, checked) => {
    const previous = completed;
    const next = new Set(previous);
    if (checked) next.add(itemId);
    else next.delete(itemId);

    setCompleted(next);
    setSavingChecklist(true);

    try {
      const saved = await apiServerClient.fetch(
        `/interview-prep/${encodeURIComponent(role)}/checklist`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: [...next] }),
        }
      );
      setCompleted(new Set(saved?.completed || []));
    } catch {
      // Put the tick back rather than leaving the UI lying about what is saved.
      setCompleted(previous);
    } finally {
      setSavingChecklist(false);
    }
  };

  const toggleAnswer = (id) => {
    setShowAnswer((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const matches = (text) => String(text || '').toLowerCase().includes(searchQuery.trim().toLowerCase());

  const checklist = prep?.checklist || [];
  const checklistDone = checklist.filter((item) => completed.has(item.id)).length;
  const checklistPercent = checklist.length ? Math.round((checklistDone / checklist.length) * 100) : 0;

  const practice = (prep?.practice || []).filter((item) => matches(item.question));
  const questions = (prep?.questions || []).filter((item) => matches(item.question));
  const tips = [
    ...(prep?.tips || []).map((tip) => ({ id: String(tip.id), title: tip.category || 'Tip', detail: tip.tip_text })),
    ...(prep?.proTips || []).map((tip, index) => ({ id: `pro-${index}`, title: tip.title, detail: tip.detail })),
  ].filter((tip) => matches(`${tip.title} ${tip.detail}`));

  // Group the checklist so the tab reads as a sequence rather than a flat list.
  const checklistGroups = checklist.reduce((groups, item) => {
    groups[item.category] = groups[item.category] || [];
    groups[item.category].push(item);
    return groups;
  }, {});

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Interview Preparation</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Practice questions with model answers, pro tips for the role, a checklist you can actually
          tick off, and real resources.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Choose a role" />
          </SelectTrigger>
          <SelectContent>
            {(roles.length ? roles : ['Software Engineer']).map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => loadPrep(role)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        prep && (
          <>
            {/* Honest about where the content came from. */}
            {!prep.aiGenerated && (
              <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
                <AlertDescription className="text-sm">
                  AI guidance was unavailable, so you are seeing the curated question bank and
                  standard interview frameworks instead of generated practice content.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="practice">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1 mb-6">
                <TabsTrigger value="practice" className="py-2.5">Practice</TabsTrigger>
                <TabsTrigger value="ai-guidance" className="py-2.5">AI Guidance</TabsTrigger>
                <TabsTrigger value="questions" className="py-2.5">Question bank</TabsTrigger>
                <TabsTrigger value="tips" className="py-2.5">Pro tips</TabsTrigger>
                <TabsTrigger value="checklist" className="py-2.5">
                  Checklist {checklistDone > 0 && <span className="ml-1 text-xs">({checklistDone})</span>}
                </TabsTrigger>
                <TabsTrigger value="resources" className="py-2.5">Resources</TabsTrigger>
              </TabsList>

              {/* ---------------------------------------------------- PRACTICE */}
              <TabsContent value="practice" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search questions..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {practice.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    No practice questions match that search.
                  </p>
                ) : (
                  practice.map((item, index) => {
                    const difficulty = normaliseDifficulty(item.difficulty);
                    const isOpen = showAnswer.has(item.id);

                    return (
                      <Card key={item.id || index}>
                        <CardContent className="p-6 space-y-4">
                          <div className="flex flex-wrap items-start gap-3">
                            <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <p className="font-semibold flex-1 min-w-[200px]">{item.question}</p>
                            <div className="flex gap-2 shrink-0">
                              {difficulty && (
                                <Badge variant="outline" className={DIFFICULTY_STYLES[difficulty]}>
                                  {difficulty}
                                </Badge>
                              )}
                              {item.category && (
                                <Badge variant="secondary" className="capitalize">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {item.answerStructure?.length > 0 && (
                            <div className="pl-10">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                Structure your answer
                              </p>
                              <ul className="space-y-1.5">
                                {item.answerStructure.map((beat, beatIndex) => (
                                  <li key={beatIndex} className="flex gap-2 text-sm text-muted-foreground">
                                    <Target className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                                    {beat}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.sampleAnswer && (
                            <div className="pl-10">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleAnswer(item.id)}
                                aria-expanded={isOpen}
                              >
                                <Sparkles className="mr-2 h-3.5 w-3.5" />
                                {isOpen ? 'Hide model answer' : 'Show model answer'}
                              </Button>

                              {isOpen && (
                                <div className="mt-3 p-4 rounded-lg bg-muted/50 border text-sm leading-relaxed">
                                  {item.sampleAnswer}
                                </div>
                              )}
                            </div>
                          )}

                          {item.watchOutFor && (
                            <div className="pl-10 flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                              <span>
                                <span className="font-semibold">Watch out: </span>
                                {item.watchOutFor}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* ------------------------------------------------ AI GUIDANCE */}
              <TabsContent value="ai-guidance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      AI Interview Guidance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Practice your answer and get AI feedback tailored to the role you're interviewing for.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="ai-question">Interview Question</Label>
                      <Textarea
                        id="ai-question"
                        placeholder="e.g., Tell me about yourself. or paste a specific question from your interview..."
                        value={aiAnswer ? '' : ''}
                        onChange={() => {}}
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-response">Your Answer</Label>
                      <Textarea
                        id="ai-response"
                        placeholder="Write your response here..."
                        value={aiAnswer}
                        onChange={(e) => setAiAnswer(e.target.value)}
                        className="min-h-[150px]"
                      />
                    </div>
                    <Button 
                      onClick={async () => {
                        if (!aiAnswer.trim()) {
                          toast.error('Please provide your answer');
                          return;
                        }
                        setAiGuidanceLoading(true);
                        setAiGuidance(null);
                        try {
                          const result = await apiServerClient.fetch('/interview-prep/guidance', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role, answer: aiAnswer })
                          });
                          setAiGuidance(result);
                        } catch (error) {
                          toast.error('Failed to get AI guidance');
                        } finally {
                          setAiGuidanceLoading(false);
                        }
                      }}
                      disabled={aiGuidanceLoading || !aiAnswer.trim()}
                    >
                      {aiGuidanceLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Get AI Guidance
                        </>
                      )}
                    </Button>

                    {aiGuidance && (
                      <div className="space-y-4 mt-6">
                        <Card className="bg-primary/5 border-primary/20">
                          <CardHeader>
                            <CardTitle className="text-base">Overall Feedback</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{aiGuidance.feedback}</p>
                          </CardContent>
                        </Card>
                        {aiGuidance.strengths && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base text-green-600">Strengths</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {aiGuidance.strengths.map((s, i) => (
                                  <li key={i} className="flex gap-2 text-sm">
                                    <CheckSquare className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                        {aiGuidance.improvements && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base text-amber-600">Improvements</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {aiGuidance.improvements.map((imp, i) => (
                                  <li key={i} className="flex gap-2 text-sm">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    {imp}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                        {aiGuidance.suggestedAnswer && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Suggested Improved Answer</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm whitespace-pre-wrap">{aiGuidance.suggestedAnswer}</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* -------------------------------------------- QUESTION BANK */}
              <TabsContent value="questions">
                {questions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    No stored questions for {role} yet.
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {questions.map((item) => (
                      <AccordionItem key={item.id} value={String(item.id)}>
                        <AccordionTrigger className="text-left">
                          <span className="flex-1 pr-4">{item.question}</span>
                          {item.difficulty && (
                            <Badge variant="outline" className="mr-2 capitalize">
                              {item.difficulty}
                            </Badge>
                          )}
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground leading-relaxed">
                            {item.sample_answer ||
                              'Focus on the STAR method: Situation, Task, Action, Result. Be specific about your own contribution.'}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </TabsContent>

              {/* ---------------------------------------------------- PRO TIPS */}
              <TabsContent value="tips">
                {tips.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No tips match that search.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tips.map((tip) => (
                      <Card key={tip.id} className="h-full">
                        <CardContent className="p-5 flex gap-3">
                          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold mb-1">{tip.title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{tip.detail}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* --------------------------------------------------- CHECKLIST */}
              <TabsContent value="checklist" className="space-y-6">
                <Card>
                  <CardContent className="p-5 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">
                          {checklistDone} of {checklist.length} done
                        </span>
                        {savingChecklist && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Saving
                          </span>
                        )}
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${checklistPercent}%` }}
                        />
                      </div>
                    </div>
                    {checklistPercent === 100 && checklist.length > 0 && (
                      <Badge className="gap-1.5">
                        <CheckSquare className="h-3.5 w-3.5" /> Ready
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {Object.entries(checklistGroups).map(([category, items]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-base">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {items.map((item) => {
                        const isDone = completed.has(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex items-start gap-3 cursor-pointer group"
                          >
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={(checked) => toggleChecklist(item.id, checked === true)}
                              className="mt-0.5"
                            />
                            <span
                              className={`text-sm leading-relaxed transition-colors ${
                                isDone ? 'line-through text-muted-foreground/60' : 'group-hover:text-foreground'
                              }`}
                            >
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}

                {/* Time-boxed stages from the interview coach. */}
                {[
                  { key: 'dayBefore', title: 'The day before', icon: Calendar, items: prep.dayBefore },
                  { key: 'duringInterview', title: 'During the interview', icon: Timer, items: prep.duringInterview },
                  { key: 'afterInterview', title: 'Straight after', icon: CheckSquare, items: prep.afterInterview },
                ]
                  .filter((stage) => stage.items?.length)
                  .map((stage) => (
                    <Card key={stage.key}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <stage.icon className="h-4 w-4 text-primary" /> {stage.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {stage.items.map((item, index) => (
                            <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
              </TabsContent>

              {/* --------------------------------------------------- RESOURCES */}
              <TabsContent value="resources">
                {prep.resources?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No resources for this role yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prep.resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all">
                          <CardContent className="p-5 flex gap-3">
                            <LinkIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold group-hover:text-primary transition-colors">
                                  {resource.title}
                                </p>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                              <Badge variant="secondary" className="mt-2">{resource.type}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Cross-links so the career tools feed each other. */}
            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link to="/career-path">See your career path</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/courses?skills=${encodeURIComponent(role)}`}>Courses for this role</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/cv-analyzer">Analyse your CV</Link>
              </Button>
            </div>
          </>
        )
      )}
    </div>
  );
};

export default InterviewPrepPage;
