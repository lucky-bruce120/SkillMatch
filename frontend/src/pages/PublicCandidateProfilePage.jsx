import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, MapPin, Phone, Mail, FileText, GraduationCap, Briefcase, Link2, Github,
} from 'lucide-react';

/**
 * PublicCandidateProfilePage
 *
 * Shows a job seeker's profile to anyone with the link. This is what an
 * employer opens when they want to see a candidate's details, whether or not
 * the candidate has applied to one of their jobs.
 */
const PublicCandidateProfilePage = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiServerClient.fetch(`/profile/public/${id}`);
        setProfile(data);
      } catch (err) {
        setError(err?.body?.error || 'This profile could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6 -ml-4">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Profile not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const education = Array.isArray(profile.education) ? profile.education : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
        <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
      </Button>

      <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-3xl font-bold text-primary">
            {profile.picture ? (
              <img
                src={`${apiServerClient.baseUrl}${profile.picture}`}
                alt={profile.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              (profile.full_name || 'U').charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight break-words">
              {profile.full_name || 'Job Seeker'}
            </h1>
            {profile.location && (
              <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin size={16} /> {profile.location}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-primary">
                  <Mail size={16} /> {profile.email}
                </a>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={16} /> {profile.phone}
                </span>
              )}
            </div>

            {(profile.linkedin_url || profile.portfolio_url || profile.github_url) && (
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Link2 size={15} /> LinkedIn
                  </a>
                )}
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Link2 size={15} /> Portfolio
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Github size={15} /> GitHub
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {profile.bio && (
          <Card>
            <CardHeader><CardTitle>About</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
          <CardContent>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill.id || skill.skill_name} variant="secondary" className="px-3 py-1 text-sm">
                    {skill.skill_name}
                    {skill.proficiency_level && (
                      <span className="ml-2 text-xs opacity-60">{skill.proficiency_level}</span>
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No skills listed.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            {experience.length > 0 ? (
              <div className="space-y-6">
                {experience.map((exp) => (
                  <div key={exp.id} className="border-b pb-6 last:border-0 last:pb-0">
                    <h4 className="text-lg font-bold">{exp.position || exp.job_title}</h4>
                    {exp.company && <p className="font-medium text-primary">{exp.company}</p>}
                    <p className="mb-2 text-sm text-muted-foreground">
                      {exp.start_date ? new Date(exp.start_date).toLocaleDateString() : 'Unknown start'}
                      {' - '}
                      {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
                    </p>
                    {exp.description && <p className="text-sm text-muted-foreground">{exp.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No experience listed.</p>
            )}
          </CardContent>
        </Card>

        {education.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {education.map((item) => (
                <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <h4 className="font-semibold">{item.school}</h4>
                  <p className="text-sm text-muted-foreground">
                    {[item.degree, item.field].filter(Boolean).join(' - ')}
                    {item.graduation_year ? ` (${item.graduation_year})` : ''}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {profile.cv_file && (
          <Card>
            <CardHeader><CardTitle>Resume / CV</CardTitle></CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href={`${apiServerClient.baseUrl}${profile.cv_file}`} target="_blank" rel="noreferrer">
                  <FileText className="mr-2 h-4 w-4" /> Download Resume
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicCandidateProfilePage;
