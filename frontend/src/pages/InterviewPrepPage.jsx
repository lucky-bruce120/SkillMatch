import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lightbulb, MessageSquare, CheckSquare, Link as LinkIcon, Search, Bookmark } from 'lucide-react';

const InterviewPrepPage = () => {
  const [role, setRole] = useState('Software Engineer');
  const [searchQuery, setSearchQuery] = useState('');
  const [questions, setQuestions] = useState([]);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);

  const checklistItems = [
    { id: 'c1', label: 'Research the company mission, values, and recent news' },
    { id: 'c2', label: 'Review the job description and map your skills to requirements' },
    { id: 'c3', label: 'Prepare your "Tell me about yourself" elevator pitch' },
    { id: 'c4', label: 'Prepare 3-5 STAR method stories for behavioral questions' },
    { id: 'c5', label: 'Prepare 3 thoughtful questions to ask the interviewer' },
    { id: 'c6', label: 'Test your tech setup (camera, mic, internet) for virtual interviews' },
    { id: 'c7', label: 'Review your resume and be ready to explain any gaps or transitions' },
    { id: 'c8', label: 'Plan your interview outfit (dress one level above daily attire)' },
  ];

  useEffect(() => {
    const fetchPrepData = async () => {
      setLoading(true);
      try {
        const [qRes, tRes] = await Promise.all([
          pb.collection('interview_questions').getList(1, 50, { filter: `job_role~"${role}"`, $autoCancel: false }),
          pb.collection('interview_tips').getList(1, 50, { filter: `job_role~"${role}" || job_role="General"`, $autoCancel: false })
        ]);
        setQuestions(qRes.items);
        setTips(tRes.items);
      } catch (error) {
        console.error("Error fetching interview prep:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrepData();
  }, [role]);

  const filteredQuestions = questions.filter(q => q.question.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTips = tips.filter(t => t.tip_text.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Preparation</h1>
          <p className="text-muted-foreground mt-1">Master your next interview with role-specific tips and practice questions.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Software Engineer">Software Engineer</SelectItem>
              <SelectItem value="Data Scientist">Data Scientist</SelectItem>
              <SelectItem value="Product Manager">Product Manager</SelectItem>
              <SelectItem value="UX Designer">UX Designer</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/50">
          <TabsTrigger value="questions" className="py-3 text-base"><MessageSquare className="w-4 h-4 mr-2" /> Practice Q&A</TabsTrigger>
          <TabsTrigger value="tips" className="py-3 text-base"><Lightbulb className="w-4 h-4 mr-2" /> Pro Tips</TabsTrigger>
          <TabsTrigger value="checklist" className="py-3 text-base"><CheckSquare className="w-4 h-4 mr-2" /> Checklist</TabsTrigger>
          <TabsTrigger value="resources" className="py-3 text-base"><LinkIcon className="w-4 h-4 mr-2" /> Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card className="border-none shadow-sm bg-card/50">
            <CardHeader>
              <CardTitle>Common Interview Questions</CardTitle>
              <CardDescription>Practice these frequently asked questions for {role} roles.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : filteredQuestions.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {filteredQuestions.map((q, idx) => (
                    <AccordionItem key={q.id} value={`item-${idx}`} className="border rounded-lg px-4 bg-background shadow-sm">
                      <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                        <div className="flex items-center gap-3 w-full pr-4">
                          <span className="flex-1">{q.question}</span>
                          <Badge variant="outline" className={
                            q.difficulty === 'Easy' ? 'text-green-600 border-green-200 bg-green-50' :
                            q.difficulty === 'Medium' ? 'text-yellow-600 border-yellow-200 bg-yellow-50' :
                            'text-red-600 border-red-200 bg-red-50'
                          }>{q.difficulty}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pt-2 pb-4 border-t mt-2">
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <strong className="text-foreground block mb-2 flex items-center gap-2">
                            <Lightbulb size={16} className="text-yellow-500" /> Sample Answer Approach:
                          </strong>
                          <p className="whitespace-pre-wrap leading-relaxed">{q.sample_answer || "Focus on the STAR method: Situation, Task, Action, Result. Be specific about your contributions."}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-12 border rounded-lg border-dashed bg-background">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No questions found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)
            ) : filteredTips.length > 0 ? (
              filteredTips.map((tip) => (
                <Card key={tip.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="secondary">{tip.category}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 text-muted-foreground hover:text-primary">
                        <Bookmark size={16} />
                      </Button>
                    </div>
                    <p className="text-foreground leading-relaxed">{tip.tip_text}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 border rounded-lg border-dashed bg-background">
                <p className="text-muted-foreground">No tips found matching your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle>Pre-Interview Checklist</CardTitle>
              <CardDescription>Make sure you're fully prepared before the big day.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3 p-4 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border">
                    <Checkbox id={item.id} className="mt-1 h-5 w-5" />
                    <label htmlFor={item.id} className="text-base font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Helpful Resources</CardTitle>
              <CardDescription>External guides and articles to boost your performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'The STAR Method Guide', desc: 'How to answer behavioral questions effectively.', type: 'Article' },
                  { title: 'System Design Primer', desc: 'Essential concepts for technical interviews.', type: 'Guide' },
                  { title: 'Salary Negotiation Tactics', desc: 'Learn how to negotiate your compensation package.', type: 'Video' },
                  { title: 'Body Language in Interviews', desc: 'Non-verbal cues that make a great impression.', type: 'Article' }
                ].map((res, i) => (
                  <div key={i} className="flex items-start gap-4 p-5 border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group">
                    <div className="p-3 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform">
                      <LinkIcon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg">{res.title}</h4>
                        <Badge variant="outline" className="text-[10px] h-5">{res.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{res.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterviewPrepPage;
