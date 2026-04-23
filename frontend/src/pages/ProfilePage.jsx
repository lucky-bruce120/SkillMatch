import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, FileText, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Simple SVG Circular Progress Component
const CircularProgress = ({ value, size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle className="text-muted stroke-current" strokeWidth={strokeWidth} cx={size / 2} cy={size / 2} r={radius} fill="transparent" />
        <circle className="text-primary stroke-current transition-all duration-1000 ease-out" strokeWidth={strokeWidth} strokeLinecap="round" cx={size / 2} cy={size / 2} r={radius} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold">{value}%</span>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '', bio: '', location: '', phone: ''
  });

  // Modal states
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({ skill_name: '', proficiency_level: 'Intermediate' });

  useEffect(() => {
    fetchProfileData();
  }, [currentUser]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      let profileRecord;
      try {
        profileRecord = await apiServerClient.fetch('/profile');
      } catch (e) {
        // Profile doesn't exist, create one
        profileRecord = await apiServerClient.fetch('/profile', {
          method: 'PUT',
          body: JSON.stringify({
            full_name: currentUser.name || '',
            profile_strength: 20
          })
        });
      }

      setProfile(profileRecord);
      setFormData({
        full_name: profileRecord.full_name || '',
        bio: profileRecord.bio || '',
        location: profileRecord.location || '',
        phone: profileRecord.phone || ''
      });

      const skillsData = await apiServerClient.fetch('/profile/skills');
      setSkills(skillsData);

      const eduData = await apiServerClient.fetch('/profile/education');
      setEducation(eduData);

      const expData = await apiServerClient.fetch('/profile/experience');
      setExperience(expData);

      // Calculate strength after fetching all data
      calculateAndSaveStrength(profileRecord, skillsData, eduData, expData);

    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const calculateAndSaveStrength = async (prof, sk, ed, ex) => {
    if (!prof) return;
    
    const fields = [
      { name: 'Full Name', completed: !!prof.full_name },
      { name: 'Bio', completed: !!prof.bio },
      { name: 'Location', completed: !!prof.location },
      { name: 'Phone', completed: !!prof.phone },
      { name: 'Resume/CV', completed: !!prof.cv_file },
      { name: 'Skills', completed: sk.length > 0 },
      { name: 'Experience', completed: ex.length > 0 },
      { name: 'Education', completed: ed.length > 0 }
    ];

    const completedCount = fields.filter(f => f.completed).length;
    const strength = Math.round((completedCount / fields.length) * 100);

    if (prof.profile_strength !== strength) {
      try {
        const updated = await apiServerClient.fetch('/profile', {
          method: 'PUT',
          body: JSON.stringify({ profile_strength: strength })
        });
        setProfile(updated);
      } catch (e) {
        console.error("Failed to update strength", e);
      }
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiServerClient.fetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      setProfile(updated);
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.skill_name) return;
    try {
      const added = await apiServerClient.fetch('/profile/skills', {
        method: 'POST',
        body: JSON.stringify(newSkill)
      });
      const newSkills = [...skills, added];
      setSkills(newSkills);
      calculateAndSaveStrength(profile, newSkills, education, experience);
      setSkillModalOpen(false);
      setNewSkill({ skill_name: '', proficiency_level: 'Intermediate' });
      toast.success("Skill added");
    } catch (error) {
      toast.error("Failed to add skill");
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await apiServerClient.fetch(`/profile/skills/${id}`, {
        method: 'DELETE'
      });
      const newSkills = skills.filter(s => s.id !== id);
      setSkills(newSkills);
      calculateAndSaveStrength(profile, newSkills, education, experience);
      toast.success("Skill removed");
    } catch (error) {
      toast.error("Failed to remove skill");
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('cv', file);

    setSaving(true);
    try {
      const response = await apiServerClient.fetch('/profile/upload-cv', {
        method: 'POST',
        body: formData
      });
      // Update profile with new CV file path
      const updated = await apiServerClient.fetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({ cv_file: response.cv_file })
      });
      setProfile(updated);
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("CV uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload CV");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8"><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and resume.</p>
        </div>
        
        <Card className="w-full md:w-auto bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <CircularProgress value={profile?.profile_strength || 0} size={60} strokeWidth={6} />
            <div>
              <p className="font-semibold text-sm">Profile Strength</p>
              <p className="text-xs text-muted-foreground">
                {profile?.profile_strength === 100 ? 'All set! You are ready to apply.' : 'Complete your profile to stand out.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1">
          <TabsTrigger value="overview" className="py-2.5">Overview</TabsTrigger>
          <TabsTrigger value="skills" className="py-2.5">Skills</TabsTrigger>
          <TabsTrigger value="experience" className="py-2.5">Experience</TabsTrigger>
          <TabsTrigger value="education" className="py-2.5">Education</TabsTrigger>
          <TabsTrigger value="cv" className="py-2.5">Resume / CV</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your basic profile details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input 
                      id="full_name" 
                      value={formData.full_name} 
                      onChange={e => setFormData({...formData, full_name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      placeholder="e.g. New York, NY or Remote"
                      value={formData.location} 
                      onChange={e => setFormData({...formData, location: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea 
                      id="bio" 
                      rows={5}
                      placeholder="Tell employers about yourself..."
                      value={formData.bio} 
                      onChange={e => setFormData({...formData, bio: e.target.value})} 
                    />
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SKILLS TAB */}
        <TabsContent value="skills">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Skills</CardTitle>
                <CardDescription>Add skills to improve your job match score.</CardDescription>
              </div>
              <Button onClick={() => setSkillModalOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Skill
              </Button>
            </CardHeader>
            <CardContent>
              {skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {skills.map(skill => (
                    <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div>
                        <p className="font-medium">{skill.skill_name}</p>
                        <p className="text-xs text-muted-foreground">{skill.proficiency_level}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSkill(skill.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No skills added yet. Add skills to get better job matches.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPERIENCE TAB */}
        <TabsContent value="experience">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>Highlight your past roles.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast("Experience form coming soon")}>
                <Plus className="mr-2 h-4 w-4" /> Add Experience
              </Button>
            </CardHeader>
            <CardContent>
              {experience.length > 0 ? (
                <div className="space-y-4">
                  {experience.map(exp => (
                    <div key={exp.id} className="p-4 border rounded-lg">
                      <h4 className="font-bold">{exp.position}</h4>
                      <p className="text-sm text-muted-foreground">{exp.company} â€¢ {new Date(exp.start_date).getFullYear()} - {exp.end_date ? new Date(exp.end_date).getFullYear() : 'Present'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No experience added yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EDUCATION TAB */}
        <TabsContent value="education">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Education</CardTitle>
                <CardDescription>Your academic background.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast("Education form coming soon")}>
                <Plus className="mr-2 h-4 w-4" /> Add Education
              </Button>
            </CardHeader>
            <CardContent>
              {education.length > 0 ? (
                <div className="space-y-4">
                  {education.map(edu => (
                    <div key={edu.id} className="p-4 border rounded-lg">
                      <h4 className="font-bold">{edu.school}</h4>
                      <p className="text-sm text-muted-foreground">{edu.degree} in {edu.field} â€¢ {edu.graduation_year}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No education added yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CV TAB */}
        <TabsContent value="cv">
          <Card>
            <CardHeader>
              <CardTitle>Resume / CV</CardTitle>
              <CardDescription>Upload your resume for employers to view.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center bg-muted/20">
                {profile?.cv_file ? (
                  <>
                    <FileText className="h-12 w-12 text-primary mb-4" />
                    <h3 className="font-medium mb-1">Resume Uploaded</h3>
                    <p className="text-sm text-muted-foreground mb-6">Your CV is currently attached to your profile.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" asChild>
                        <a href={`http://localhost:3001${profile.cv_file}`} target="_blank" rel="noreferrer">View File</a>
                      </Button>
                      <div className="relative">
                        <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx" onChange={handleCVUpload} disabled={saving} />
                        <Button disabled={saving}>Replace File</Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">Upload your Resume</h3>
                    <p className="text-sm text-muted-foreground mb-6">PDF, DOC, or DOCX up to 20MB</p>
                    <div className="relative">
                      <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx" onChange={handleCVUpload} disabled={saving} />
                      <Button disabled={saving}>{saving ? "Uploading..." : "Select File"}</Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Skill Modal */}
      <Dialog open={skillModalOpen} onOpenChange={setSkillModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Skill Name</Label>
              <Input 
                placeholder="e.g. React, Python, Project Management" 
                value={newSkill.skill_name}
                onChange={e => setNewSkill({...newSkill, skill_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Proficiency Level</Label>
              <Select value={newSkill.proficiency_level} onValueChange={v => setNewSkill({...newSkill, proficiency_level: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSkill}>Add Skill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
