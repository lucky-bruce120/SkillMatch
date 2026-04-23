import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Phone, Mail, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const CandidateProfilePage = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [experience, setExperience] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        const candidate = await apiServerClient.fetch(`/employer/candidates/${id}`, {
          headers: { Authorization: `Bearer ${currentUser?.token}` },
        });

        setUser({ email: candidate.email, name: candidate.full_name });
        setProfile(candidate);
        setSkills(candidate.skills || []);
        setExperience(candidate.experience || []);
      } catch (error) {
        console.error('Error fetching candidate:', error);
        toast.error('Failed to load candidate profile');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.token) {
      fetchCandidateData();
    }
  }, [id, currentUser]);

  if (loading) {
    return (
      <div className="dashboard-container space-y-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="dashboard-container max-w-4xl">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
        <Link to={-1}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
      </Button>

      <div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-3xl font-bold text-primary">
            {profile?.picture ? (
              <img src={`${apiServerClient.baseUrl}${profile.picture}`} alt={profile?.full_name} className="h-full w-full object-cover" />
            ) : (
              (profile?.full_name || user?.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name || user?.name || 'Unknown Candidate'}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile?.location && <span className="flex items-center gap-1"><MapPin size={16} /> {profile.location}</span>}
              {user?.email && <span className="flex items-center gap-1"><Mail size={16} /> {user.email}</span>}
              {profile?.phone && <span className="flex items-center gap-1"><Phone size={16} /> {profile.phone}</span>}
            </div>
          </div>
        </div>
        <div className="flex w-full gap-3 md:w-auto">
          <Button onClick={() => toast('Interview scheduling coming soon')}>
            <Calendar className="mr-2 h-4 w-4" /> Invite to Interview
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {profile?.bio && (
          <Card>
            <CardHeader><CardTitle>About</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{profile.bio}</p>
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
                    {skill.skill_name} <span className="ml-2 text-xs opacity-50">{skill.proficiency_level}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No skills listed.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Experience</CardTitle></CardHeader>
          <CardContent>
            {experience.length > 0 ? (
              <div className="space-y-6">
                {experience.map((exp) => (
                  <div key={exp.id} className="border-b pb-6 last:border-0 last:pb-0">
                    <h4 className="text-lg font-bold">{exp.position}</h4>
                    <p className="font-medium text-primary">{exp.company}</p>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {exp.start_date ? new Date(exp.start_date).toLocaleDateString() : 'Unknown start'} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
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

        {profile?.cv_file && (
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

export default CandidateProfilePage;
