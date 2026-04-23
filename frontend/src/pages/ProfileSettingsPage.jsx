import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Plus, FileText, UploadCloud, Download, Loader2, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import ExperienceModal from '@/components/ExperienceModal.jsx';
import SkillsModal from '@/components/SkillsModal.jsx';
import EducationModal from '@/components/EducationModal.jsx';

const ProfileSettingsPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [cvUploadError, setCvUploadError] = useState(null);
  
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);

  const [formData, setFormData] = useState({
    full_name: '', bio: '', location: '', phone: '', date_of_birth: '', gender: '', nationality: '', linkedin_url: '', portfolio_url: '', github_url: ''
  });

  const [picPreview, setPicPreview] = useState(null);

  // Modal States
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState(null);

  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);

  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [selectedEdu, setSelectedEdu] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, [currentUser]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      console.log('[PROFILE INIT] Fetching profile for user:', currentUser?.id);

      // Fetch profile from API
      const profileResponse = await apiServerClient.fetch('/profile', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (profileResponse.ok) {
        const profileRecord = await profileResponse.json();
        console.log('[PROFILE INIT] Found existing profile:', profileRecord._id);

        setProfile(profileRecord);
        setFormData({
          full_name: profileRecord.firstName + ' ' + profileRecord.lastName || '',
          bio: profileRecord.bio || '',
          location: profileRecord.location || '',
          phone: profileRecord.phone || '',
          date_of_birth: profileRecord.date_of_birth ? profileRecord.date_of_birth.split('T')[0] : '',
          gender: profileRecord.gender || '',
          nationality: profileRecord.nationality || '',
          linkedin_url: profileRecord.linkedin_url || '',
          portfolio_url: profileRecord.portfolio_url || '',
          github_url: profileRecord.github_url || ''
        });

        if (profileRecord.picture) {
          setPicPreview(`${import.meta.env.VITE_API_SERVER_URL}${profileRecord.picture}`);
        }
      } else {
        // Profile doesn't exist, create empty profile
        console.log('[PROFILE INIT] No profile found, will create on save');
        setProfile(null);
        setFormData({
          full_name: currentUser?.name || '',
          bio: '', location: '', phone: '', date_of_birth: '', gender: '', nationality: '',
          linkedin_url: '', portfolio_url: '', github_url: ''
        });
      }

      // Fetch skills, education, experience from API
      const [skillsResponse, eduResponse, expResponse] = await Promise.all([
        apiServerClient.fetch('/profile/skills', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        }),
        apiServerClient.fetch('/profile/education', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        }),
        apiServerClient.fetch('/profile/experience', {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        })
      ]);

      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json();
        setSkills(skillsData);
      }

      if (eduResponse.ok) {
        const eduData = await eduResponse.json();
        setEducation(eduData);
      }

      if (expResponse.ok) {
        const expData = await expResponse.json();
        setExperience(expData);
      }

      // Calculate profile strength
      calculateAndSaveStrength(profile, skills, education, experience);
    } catch (error) {
      console.error('[PROFILE INIT] Error:', error);
      setUpdateError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };
  const calculateAndSaveStrength = async (prof, sk, ed, ex) => {
    if (!prof) return;
    const fields = [
      { name: 'Full Name', completed: !!prof.firstName && !!prof.lastName },
      { name: 'Bio', completed: !!prof.bio },
      { name: 'Location', completed: !!prof.location },
      { name: 'Phone', completed: !!prof.phone },
      { name: 'Resume/CV', completed: !!prof.cv },
      { name: 'Skills', completed: sk.length > 0 },
      { name: 'Experience', completed: ex.length > 0 },
      { name: 'Education', completed: ed.length > 0 },
      { name: 'LinkedIn', completed: !!prof.linkedin_url },
      { name: 'Profile Picture', completed: !!prof.picture }
    ];
    const completedCount = fields.filter(f => f.completed).length;
    const strength = Math.round((completedCount / fields.length) * 100);

    // Profile strength is now calculated client-side only
    // No need to save to backend as it's derived data
    console.log(`[PROFILE STRENGTH] Calculated: ${strength}% (${completedCount}/${fields.length} fields)`);
  };

  const handleProfileUpdate = async (e) => {
    if (e) e.preventDefault();
    setUpdateError(null);

    console.log('----------------------------------------');
    console.log('[PROFILE UPDATE] Initiating profile update');
    console.log('[PROFILE UPDATE] Current User ID:', currentUser?.id);

    if (!formData.full_name || formData.full_name.trim() === '') {
      const errMsg = "Full Name is a required field.";
      console.warn('[PROFILE UPDATE] Validation failed:', errMsg);
      setUpdateError(errMsg);
      toast.error(errMsg);
      return;
    }

    setSaving(true);
    try {
      const dataToSave = { ...formData };
      // Handle empty date fields
      if (!dataToSave.date_of_birth) {
        dataToSave.date_of_birth = null;
      }

      console.log('[PROFILE UPDATE] Payload being sent to API:', dataToSave);

      const response = await apiServerClient.fetch('/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updated = await response.json();

      console.log('[PROFILE UPDATE] Success! Response:', updated);
      setProfile(updated);
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error('[PROFILE UPDATE] FAILED. Error object:', error);

      let errorMessage = "An unexpected error occurred while updating your profile.";

      if (error.message) {
        errorMessage = error.message;
      }

      setUpdateError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      console.log('----------------------------------------');
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('----------------------------------------');
    console.log('[PIC UPLOAD] File selected:', file.name);
    console.log('[PIC UPLOAD] Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('[PIC UPLOAD] Type:', file.type);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      const errMsg = "Invalid format. Please upload JPG, PNG, GIF, or WebP.";
      console.warn('[PIC UPLOAD] Validation failed:', errMsg);
      toast.error(errMsg);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const errMsg = `File too large. Maximum size is 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`;
      console.warn('[PIC UPLOAD] Validation failed:', errMsg);
      toast.error(errMsg);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPicPreview(e.target.result);
    reader.readAsDataURL(file);

    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append('picture', file);

      console.log('[PIC UPLOAD] Sending FormData to API...');
      const response = await apiServerClient.fetch('/profile/upload-picture', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload picture');
      }

      const updated = await response.json();

      console.log('[PIC UPLOAD] Success! Response:', updated);
      setProfile(updated);
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("Profile picture updated successfully");
    } catch (error) {
      console.error('[PIC UPLOAD] FAILED. Error object:', error);
      let errMsg = "Failed to upload picture.";
      if (error.message) {
        errMsg = error.message;
      }
      toast.error(errMsg);
      setPicPreview(profile?.picture ? `${import.meta.env.VITE_API_SERVER_URL}${profile.picture}` : null);
    } finally {
      setUploadingPic(false);
      console.log('----------------------------------------');
    }
  };

  const handleRemovePic = async () => {
    setUploadingPic(true);
    try {
      const response = await apiServerClient.fetch('/profile/remove-picture', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove picture');
      }

      const updated = await response.json();
      setProfile(updated);
      setPicPreview(null);
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("Profile picture removed");
    } catch (error) {
      console.error('[PIC REMOVE] Failed:', error);
      toast.error("Failed to remove picture");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setCvUploadError(null);
    console.log('----------------------------------------');
    console.log('[CV UPLOAD] File selected:', file.name);
    console.log('[CV UPLOAD] Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('[CV UPLOAD] Type:', file.type);

    // Validate File Type
    const validTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(file.type)) {
      const errMsg = "Invalid file type. Only PDF, DOC, and DOCX files are accepted.";
      console.warn('[CV UPLOAD] Validation failed:', errMsg);
      setCvUploadError(errMsg);
      toast.error(errMsg);
      return;
    }

    // Validate File Size (20MB limit based on schema)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      const errMsg = `File size exceeds 20MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`;
      console.warn('[CV UPLOAD] Validation failed:', errMsg);
      setCvUploadError(errMsg);
      toast.error(errMsg);
      return;
    }

    const formData = new FormData();
    formData.append('cv', file);

    setSaving(true);
    try {
      console.log('[CV UPLOAD] Sending FormData to API...');
      const response = await apiServerClient.fetch('/profile/upload-cv', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload CV');
      }

      const updated = await response.json();

      console.log('[CV UPLOAD] Success! Response:', updated);
      setProfile(updated);
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("CV uploaded successfully");
    } catch (error) {
      console.error('[CV UPLOAD] FAILED. Error object:', error);

      let errorMessage = "An unexpected error occurred while uploading your CV.";

      if (error.message) {
        errorMessage = error.message;
      }

      setCvUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      // Reset file input so the same file can be selected again if needed
      e.target.value = null;
      console.log('----------------------------------------');
    }
  };

  // Experience Handlers
  const handleSaveExperience = async (data) => {
    try {
      const dataToSave = { ...data };
      if (dataToSave.currently_working) delete dataToSave.end_date;
      if (!dataToSave.end_date) delete dataToSave.end_date;

      let updatedExps;
      if (data.id) {
        const response = await apiServerClient.fetch(`/profile/experience/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(dataToSave)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update experience');
        }

        const updated = await response.json();
        updatedExps = experience.map(e => e.id === data.id ? updated : e);
        toast.success("Experience updated");
      } else {
        const response = await apiServerClient.fetch('/profile/experience', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(dataToSave)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add experience');
        }

        const added = await response.json();
        updatedExps = [added, ...experience].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        toast.success("Experience added");
      }
      setExperience(updatedExps);
      calculateAndSaveStrength(profile, skills, education, updatedExps);
      setExpModalOpen(false);
    } catch (error) {
      console.error('[EXPERIENCE SAVE] Error:', error);
      toast.error("Failed to save experience");
    }
  };

  const handleDeleteExperience = async (id) => {
    try {
      const response = await apiServerClient.fetch(`/profile/experience/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete experience');
      }

      const newExps = experience.filter(e => e.id !== id);
      setExperience(newExps);
      calculateAndSaveStrength(profile, skills, education, newExps);
      setExpModalOpen(false);
      toast.success("Experience removed");
    } catch (error) {
      console.error('[EXPERIENCE DELETE] Error:', error);
      toast.error("Failed to remove experience");
    }
  };

  // Skills Handlers
  const handleSaveSkill = async (data) => {
    try {
      let updatedSkills;
      if (data.id) {
        const response = await apiServerClient.fetch(`/profile/skills/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update skill');
        }

        const updated = await response.json();
        updatedSkills = skills.map(s => s.id === data.id ? updated : s);
        toast.success("Skill updated");
      } else {
        const response = await apiServerClient.fetch('/profile/skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add skill');
        }

        const added = await response.json();
        updatedSkills = [...skills, added];
        toast.success("Skill added");
      }
      setSkills(updatedSkills);
      calculateAndSaveStrength(profile, updatedSkills, education, experience);
      setSkillModalOpen(false);
    } catch (error) {
      console.error('[SKILL SAVE] Error:', error);
      toast.error("Failed to save skill");
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      const response = await apiServerClient.fetch(`/profile/skills/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete skill');
      }

      const newSkills = skills.filter(s => s.id !== id);
      setSkills(newSkills);
      calculateAndSaveStrength(profile, newSkills, education, experience);
      setSkillModalOpen(false);
      toast.success("Skill removed");
    } catch (error) {
      console.error('[SKILL DELETE] Error:', error);
      toast.error("Failed to remove skill");
    }
  };

  // Education Handlers
  const handleSaveEducation = async (data) => {
    try {
      const dataToSave = { ...data, field: data.field_of_study };
      if (!dataToSave.start_date) delete dataToSave.start_date;
      if (!dataToSave.end_date) delete dataToSave.end_date;

      let updatedEdus;
      if (data.id) {
        const response = await apiServerClient.fetch(`/profile/education/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(dataToSave)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update education');
        }

        const updated = await response.json();
        updatedEdus = education.map(e => e.id === data.id ? updated : e);
        toast.success("Education updated");
      } else {
        const response = await apiServerClient.fetch('/profile/education', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(dataToSave)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add education');
        }

        const added = await response.json();
        updatedEdus = [added, ...education].sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
        toast.success("Education added");
      }
      setEducation(updatedEdus);
      calculateAndSaveStrength(profile, skills, updatedEdus, experience);
      setEduModalOpen(false);
    } catch (error) {
      console.error('[EDUCATION SAVE] Error:', error);
      toast.error("Failed to save education");
    }
  };

  const handleDeleteEducation = async (id) => {
    try {
      const response = await apiServerClient.fetch(`/profile/education/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete education');
      }

      const newEdus = education.filter(e => e.id !== id);
      setEducation(newEdus);
      calculateAndSaveStrength(profile, skills, newEdus, experience);
      setEduModalOpen(false);
      toast.success("Education removed");
    } catch (error) {
      console.error('[EDUCATION DELETE] Error:', error);
      toast.error("Failed to remove education");
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
          <p className="text-muted-foreground mt-1">Manage your personal information, experience, and resume.</p>
        </div>
        
        <Card className="w-full md:w-72 bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm">Profile Strength</span>
              <span className="font-bold text-primary">{profile?.profile_strength || 0}%</span>
            </div>
            <Progress value={profile?.profile_strength || 0} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {profile?.profile_strength === 100 ? 'All set! You are ready to apply.' : 'Complete your profile to stand out to employers.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1">
          <TabsTrigger value="personal" className="py-2.5">Personal Info</TabsTrigger>
          <TabsTrigger value="experience" className="py-2.5">Experience</TabsTrigger>
          <TabsTrigger value="education" className="py-2.5">Education</TabsTrigger>
          <TabsTrigger value="skills" className="py-2.5">Skills</TabsTrigger>
          <TabsTrigger value="resume" className="py-2.5">Resume / CV</TabsTrigger>
        </TabsList>

        {/* PERSONAL INFO TAB */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your basic profile details and links.</CardDescription>
            </CardHeader>
            <CardContent>
              {updateError && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Update Failed</h4>
                    <p className="text-sm mt-1">{updateError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center gap-4 shrink-0">
                    <div className="h-32 w-32 rounded-2xl bg-muted overflow-hidden border-2 border-border flex items-center justify-center relative group shadow-sm">
                      {uploadingPic ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : picPreview ? (
                        <img src={picPreview} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <UploadCloud className="text-white h-8 w-8" />
                        <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleProfilePicChange} disabled={uploadingPic} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="relative w-full">
                        <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploadingPic}>
                          Change Picture
                        </Button>
                        <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleProfilePicChange} disabled={uploadingPic} />
                      </div>
                      {picPreview && (
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleRemovePic} disabled={uploadingPic}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input id="full_name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" placeholder="e.g. New York, NY or Remote" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input id="nationality" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea id="bio" rows={4} placeholder="Tell employers about yourself..." value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input id="linkedin_url" type="url" placeholder="https://linkedin.com/in/..." value={formData.linkedin_url} onChange={e => setFormData({...formData, linkedin_url: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github_url">GitHub URL</Label>
                    <Input id="github_url" type="url" placeholder="https://github.com/..." value={formData.github_url} onChange={e => setFormData({...formData, github_url: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio_url">Portfolio URL</Label>
                    <Input id="portfolio_url" type="url" placeholder="https://..." value={formData.portfolio_url} onChange={e => setFormData({...formData, portfolio_url: e.target.value})} />
                  </div>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                  {updateError && (
                    <Button type="button" variant="outline" onClick={handleProfileUpdate} disabled={saving}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Retry
                    </Button>
                  )}
                  <Button type="submit" size="lg" disabled={saving}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPERIENCE TAB */}
        <TabsContent value="experience">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>Highlight your past and current roles.</CardDescription>
              </div>
              <Button onClick={() => { setSelectedExp(null); setExpModalOpen(true); }} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Experience
              </Button>
            </CardHeader>
            <CardContent>
              {experience.length > 0 ? (
                <div className="space-y-4">
                  {experience.map(exp => (
                    <div 
                      key={exp.id} 
                      className="relative p-4 border rounded-xl hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                      onClick={() => { setSelectedExp(exp); setExpModalOpen(true); }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{exp.job_title}</h4>
                          <p className="font-medium">{exp.company} <span className="text-muted-foreground font-normal text-sm ml-2">â€¢ {exp.employment_type}</span></p>
                          <p className="text-sm text-muted-foreground mb-2">
                            {exp.start_date ? new Date(exp.start_date).toLocaleDateString(undefined, {month: 'short', year: 'numeric'}) : ''} - 
                            {exp.currently_working ? ' Present' : (exp.end_date ? ` ${new Date(exp.end_date).toLocaleDateString(undefined, {month: 'short', year: 'numeric'})}` : '')}
                          </p>
                        </div>
                      </div>
                      {exp.description && <p className="text-sm text-foreground mt-2 line-clamp-2">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg border-dashed">
                  <p className="text-muted-foreground mb-4">No experience added yet.</p>
                  <Button variant="outline" onClick={() => { setSelectedExp(null); setExpModalOpen(true); }}>Add Your First Role</Button>
                </div>
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
                <CardDescription>Your academic background and qualifications.</CardDescription>
              </div>
              <Button onClick={() => { setSelectedEdu(null); setEduModalOpen(true); }} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Education
              </Button>
            </CardHeader>
            <CardContent>
              {education.length > 0 ? (
                <div className="space-y-4">
                  {education.map(edu => (
                    <div 
                      key={edu.id} 
                      className="relative p-4 border rounded-xl hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                      onClick={() => { setSelectedEdu(edu); setEduModalOpen(true); }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{edu.school}</h4>
                          <p className="font-medium">{edu.degree} in {edu.field || edu.field_of_study}</p>
                          <p className="text-sm text-muted-foreground mb-2">
                            {edu.start_date ? new Date(edu.start_date).getFullYear() : ''} - {edu.end_date ? new Date(edu.end_date).getFullYear() : edu.graduation_year}
                          </p>
                        </div>
                      </div>
                      {edu.grade && <p className="text-sm font-medium mt-1">Grade: {edu.grade}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg border-dashed">
                  <p className="text-muted-foreground mb-4">No education added yet.</p>
                  <Button variant="outline" onClick={() => { setSelectedEdu(null); setEduModalOpen(true); }}>Add Education</Button>
                </div>
              )}
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
              <Button onClick={() => { setSelectedSkill(null); setSkillModalOpen(true); }} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Skill
              </Button>
            </CardHeader>
            <CardContent>
              {skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {skills.map(skill => (
                    <div 
                      key={skill.id} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group"
                      onClick={() => { setSelectedSkill(skill); setSkillModalOpen(true); }}
                    >
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{skill.skill_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{skill.proficiency_level}</Badge>
                          {skill.endorsement_count > 0 && <span className="text-xs text-muted-foreground">{skill.endorsement_count} endorsements</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg border-dashed">
                  <p className="text-muted-foreground mb-4">No skills added yet. Add skills to get better job matches.</p>
                  <Button variant="outline" onClick={() => { setSelectedSkill(null); setSkillModalOpen(true); }}>Add Skills</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CV TAB */}
        <TabsContent value="resume">
          <Card>
            <CardHeader>
              <CardTitle>Resume / CV</CardTitle>
              <CardDescription>Upload your resume for employers to view and for AI analysis.</CardDescription>
            </CardHeader>
            <CardContent>
              {cvUploadError && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Upload Failed</h4>
                    <p className="text-sm mt-1">{cvUploadError}</p>
                  </div>
                </div>
              )}

              <div className={`border-2 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center transition-colors ${profile?.cv_file ? 'bg-primary/5 border-primary/20' : 'bg-muted/20'}`}>
                {profile?.cv_file ? (
                  <>
                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Resume Uploaded</h3>
                    <p className="text-sm text-muted-foreground mb-6">Your CV is currently attached to your profile and ready for applications.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button variant="outline" asChild>
                        <a href={`${apiServerClient.baseUrl}/profile/cv`} target="_blank" rel="noreferrer">
                          <Download className="mr-2 h-4 w-4" /> Download
                        </a>
                      </Button>
                      <div className="relative">
                        <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx" onChange={handleCVUpload} disabled={saving} />
                        <Button disabled={saving} variant="secondary">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                          Replace File
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-4">
                      <UploadCloud className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Upload your Resume</h3>
                    <p className="text-sm text-muted-foreground mb-6">PDF, DOC, or DOCX up to 20MB</p>
                    <div className="relative">
                      <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx" onChange={handleCVUpload} disabled={saving} />
                      <Button disabled={saving} size="lg">
                        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Select File"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExperienceModal 
        isOpen={expModalOpen} 
        onClose={() => setExpModalOpen(false)} 
        experience={selectedExp} 
        onSave={handleSaveExperience} 
        onDelete={handleDeleteExperience} 
      />

      <SkillsModal 
        isOpen={skillModalOpen} 
        onClose={() => setSkillModalOpen(false)} 
        skill={selectedSkill} 
        onSave={handleSaveSkill} 
        onDelete={handleDeleteSkill} 
      />

      <EducationModal 
        isOpen={eduModalOpen} 
        onClose={() => setEduModalOpen(false)} 
        education={selectedEdu} 
        onSave={handleSaveEducation} 
        onDelete={handleDeleteEducation} 
      />
    </div>
  );
};

export default ProfileSettingsPage;
