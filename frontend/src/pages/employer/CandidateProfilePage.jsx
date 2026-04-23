import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Phone, Mail, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const CandidateProfilePage = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [experience, setExperience] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        // For now, we'll show basic user info since we don't have detailed profile endpoints
        // In a real app, you'd have endpoints to fetch user profiles, skills, experience, etc.
        setUser({ email: 'candidate@example.com', name: 'John Doe' }); // Mock data
        setProfile({ full_name: 'John Doe', location: 'New York', bio: 'Experienced developer' });
        setSkills([{ skill_name: 'JavaScript', proficiency_level: 'Expert' }]);
        setExperience([{ position: 'Developer', company: 'Tech Corp', start_date: '2020-01-01', description: 'Full stack development' }]);

      } catch (error) {
        console.error("Error fetching candidate:", error);
        toast.error("Failed to load candidate profile");
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [id]);

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

      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
            {(profile?.full_name || user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name || user?.name || 'Unknown Candidate'}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              {profile?.location && <span className="flex items-center gap-1"><MapPin size={16} /> {profile.location}</span>}
              {user?.email && <span className="flex items-center gap-1"><Mail size={16} /> {user.email}</span>}
              {profile?.phone && <span className="flex items-center gap-1"><Phone size={16} /> {profile.phone}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button onClick={() => toast("Interview scheduling coming soon")}>
            <Calendar className="mr-2 h-4 w-4" /> Invite to Interview
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {profile?.bio && (
          <Card>
            <CardHeader><CardTitle>About</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
          <CardContent>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <Badge key={skill.id} variant="secondary" className="px-3 py-1 text-sm">
                    {skill.skill_name} <span className="ml-2 opacity-50 text-xs">{skill.proficiency_level}</span>
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
                {experience.map(exp => (
                  <div key={exp.id} className="border-b last:border-0 pb-6 last:pb-0">
                    <h4 className="font-bold text-lg">{exp.position}</h4>
                    <p className="text-primary font-medium">{exp.company}</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
                    </p>
                    {exp.description && <p className="text-muted-foreground text-sm">{exp.description}</p>}
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
                <a href={pb.files.getUrl(profile, profile.cv_file)} target="_blank" rel="noreferrer">
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
