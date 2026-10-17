import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Briefcase, Clock, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const JobCard = ({ job, matchScore, onSave, isSaved }) => {
  // Some endpoints return a populated Mongoose document where the `id` virtual
  // is absent, so fall back to `_id`. Without this, "View Details" silently
  // linked to /job/undefined.
  const jobId = job?.id || job?._id;

  if (!jobId) {
    return (
      <Card className="flex flex-col justify-center">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          This job is no longer available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-md group">
      <CardContent className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              <Link to={`/job/${jobId}`}>{job.title}</Link>
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
            <span className="line-clamp-1">
              {job.location || 'Location not specified'}
              {job.remoteType || job.remote_type ? ` (${job.remoteType || job.remote_type})` : ''}
            </span>
          </div>

          {/* Only render salary when the job actually declares one, instead of
              showing "$undefined - $undefined". */}
          {(() => {
            const min = job.salary_min ?? job.salaryMin;
            const max = job.salary_max ?? job.salaryMax;
            const single = job.salary;
            if (min == null && max == null && single == null) return null;
            return (
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="shrink-0" />
                <span>
                  {min != null && max != null
                    ? `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()}`
                    : `$${Number(min ?? max ?? single).toLocaleString()}`}
                </span>
              </div>
            );
          })()}

          {(job.jobType || job.job_type) && (
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="shrink-0" />
              <span>{job.jobType || job.job_type}</span>
            </div>
          )}
          {job.experience_level && (
            <div className="flex items-center gap-2">
              <Clock size={16} className="shrink-0" />
              <span className="capitalize">{job.experience_level}</span>
            </div>
          )}
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
          <Link to={`/job/${jobId}`}>View Details</Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onSave && onSave(jobId)}
          className={isSaved ? "text-destructive border-destructive hover:bg-destructive/10" : ""}
          aria-label={isSaved ? 'Remove from saved' : 'Save job'}
        >
          <Heart size={18} className={isSaved ? "fill-current" : ""} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default JobCard;
