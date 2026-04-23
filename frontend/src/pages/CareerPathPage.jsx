import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Clock, DollarSign, Target, ChevronRight, Star } from 'lucide-react';

const CareerPathPage = () => {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPaths([
      { id: '1', current_role: 'Junior Developer', next_role: 'Software Engineer', timeline: '1-2 years', salary_range: '$70k - $95k', required_skills: 'JavaScript, React, Testing' },
      { id: '2', current_role: 'Software Engineer', next_role: 'Senior Engineer', timeline: '2-4 years', salary_range: '$110k - $150k', required_skills: 'System Design, Mentoring, Cloud Architecture' },
      { id: '3', current_role: 'Senior Engineer', next_role: 'Engineering Manager', timeline: '2-3 years', salary_range: '$140k - $190k', required_skills: 'Leadership, Delivery Planning, Stakeholder Management' }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-6">
          {[1, 2, 3].map((index) => <Skeleton key={index} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Career Path Explorer</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Visualize your professional journey. Discover potential career trajectories, required skills, and salary expectations to plan your next move.
        </p>
      </div>

      <div className="space-y-16 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-primary/20 before:to-transparent">
        {paths.map((path, index) => (
          <div key={path.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              {index === 0 ? <Star size={20} /> : <Target size={20} />}
            </div>

            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] hover:shadow-xl transition-all duration-300 border-muted/50 hover:border-primary/30">
              <CardContent className="p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm font-medium text-muted-foreground mb-4">
                  <Briefcase size={14} /> {path.current_role}
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-2xl font-bold">{path.next_role}</h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Next Step</Badge>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 p-4 bg-muted/30 rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Timeline</p>
                    <div className="flex items-center gap-2 font-medium">
                      <Clock size={16} className="text-primary" />
                      <span>{path.timeline}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Est. Salary</p>
                    <div className="flex items-center gap-2 font-medium">
                      <DollarSign size={16} className="text-green-600" />
                      <span>{path.salary_range}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Required Skills to Develop</p>
                  <div className="flex flex-wrap gap-2">
                    {String(path.required_skills || '').split(',').map((skill, index2) => (
                      <Badge key={index2} variant="outline" className="border-primary/20 bg-background">
                        {skill.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button className="w-full group-hover:bg-primary/90 transition-colors" asChild>
                  <Link to={`/courses?skills=${path.required_skills}`}>
                    Find Courses for this Path <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareerPathPage;
