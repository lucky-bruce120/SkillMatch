import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Briefcase, Clock, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const JobCard = ({ job, matchScore, onSave, isSaved }) => {
  return (
    <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-md group">
      <CardContent className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              <Link to={`/job/${job.id}`}>{job.title}</Link>
            </h3>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
          {matchScore !== undefined && (
            <Badge variant={matchScore > 80 ? "default" : matchScore > 50 ? "secondary" : "outline"} className="ml-2 shrink-0">
              {matchScore}% Match
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="shrink-0" />
            <span className="line-clamp-1">{job.location} ({job.remoteType || job.remote_type})</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="shrink-0" />
            <span>${job.salary_min?.toLocaleString()} - ${job.salary_max?.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="shrink-0" />
            <span>{job.jobType || job.job_type}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="shrink-0" />
            <span>{job.experience_level}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {(Array.isArray(job.required_skills) ? job.required_skills : String(job.required_skills || '').split(',').filter(Boolean)).slice(0, 3).map((skill, idx) => (
            <Badge key={idx} variant="outline" className="bg-muted/50">
              {String(skill).trim()}
            </Badge>
          ))}
          {(Array.isArray(job.required_skills) ? job.required_skills.length : String(job.required_skills || '').split(',').filter(Boolean).length) > 3 && (
            <Badge variant="outline" className="bg-muted/50">
              +{(Array.isArray(job.required_skills) ? job.required_skills.length : String(job.required_skills || '').split(',').filter(Boolean).length) - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 mt-auto flex gap-3">
        <Button asChild className="flex-1">
          <Link to={`/job/${job.id}`}>View Details</Link>
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => onSave && onSave(job.id)}
          className={isSaved ? "text-destructive border-destructive hover:bg-destructive/10" : ""}
        >
          <Heart size={18} className={isSaved ? "fill-current" : ""} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default JobCard;
