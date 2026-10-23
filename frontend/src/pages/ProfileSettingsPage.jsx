import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Plus, FileText, UploadCloud, Download, Loader2, Image as ImageIcon, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import ExperienceModal from '@/components/ExperienceModal.jsx';
import SkillsModal from '@/components/SkillsModal.jsx';
import EducationModal from '@/components/EducationModal.jsx';

const TABS = [
  { value: 'personal', label: 'Personal Info' },
  { value: 'preferences', label: 'Job Preferences' },
  { value: 'skills', label: 'Skills' },
  { value: 'experience', label: 'Experience' },
  { value: 'education', label: 'Education' },
  { value: 'resume', label: 'Resume / CV' },
];

const VALID_TABS = TABS.map((tab) => tab.value);

const ProfileSettingsPage = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tabs are deep-linkable, so the dashboard's "Update Resume" and
  // "Add New Skills" buttons can open this page on the right tab instead of
  // always landing on Personal Info.
  const requestedTab = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(requestedTab) ? requestedTab : 'personal';

  const setActiveTab = useCallback(
    (tab) => {
      if (tab === 'personal') {
        // Keep the URL clean for the default tab.
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab }, { replace: true });
      }
    },
    [setSearchParams]
  );

  const token = currentUser?.token;
  // The User model has no `name` field, so this used to always be undefined and
  // the prefilled form came up blank. Fall back to the email local-part instead.
  const currentUserName = useMemo(() => {
    const localPart = currentUser?.email?.split('@')[0] || '';
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }, [currentUser?.email]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState('');
  const [downloadingCV, setDownloadingCV] = useState(false);
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

  const [preferences, setPreferences] = useState({
    desired_roles: '',
    preferred_locations: '',
    work_arrangement: 'any',
    job_type: 'any',
    experience_level: 'any',
    expected_salary_min: '',
    expected_salary_max: '',
    availability: '',
    open_to_relocate: false,
    profile_visible: true,
  });

  const [picPreview, setPicPreview] = useState(null);

  // Snapshot of the form as last saved, so we can warn before losing edits.
  const [savedFormData, setSavedFormData] = useState(null);

  // The backend returns a 0-10 field count rendered as a percentage, so fall
  // back to counting locally when it is absent.
  const strengthBreakdown = useMemo(() => {
    const fields = [
      { label: 'Full name', done: Boolean(formData.full_name?.trim()) },
      { label: 'Bio', done: Boolean(formData.bio?.trim()) },
      { label: 'Location', done: Boolean(formData.location?.trim()) },
      { label: 'Phone', done: Boolean(formData.phone?.trim()) },
      { label: 'LinkedIn', done: Boolean(formData.linkedin_url?.trim()) },
      { label: 'Profile photo', done: Boolean(profile?.picture) },
      { label: 'Resume / CV', done: Boolean(profile?.cv) },
      { label: 'Skills', done: skills.length > 0 },
      { label: 'Experience', done: experience.length > 0 },
      { label: 'Education', done: education.length > 0 },
    ];

    const done = fields.filter((field) => field.done).length;
    return {
      fields,
      done,
      total: fields.length,
      percent: Math.round((done / fields.length) * 100),
      missing: fields.filter((field) => !field.done),
    };
  }, [formData, profile, skills, experience, education]);

  // Guard against firing on the very first render, before the form is populated.
  const hasUnsavedChanges =
    savedFormData !== null && JSON.stringify(formData) !== JSON.stringify(savedFormData);

  // Roles and locations are stored as arrays but edited as comma-separated
  // text, which is far less fiddly than a chip input.
  const preferencesToRequest = () => ({
    desired_roles: preferences.desired_roles.split(',').map((value) => value.trim()).filter(Boolean),
    preferred_locations: preferences.preferred_locations.split(',').map((value) => value.trim()).filter(Boolean),
    work_arrangement: preferences.work_arrangement,
    job_type: preferences.job_type,
    experience_level: preferences.experience_level,
    expected_salary_min: preferences.expected_salary_min ? Number(preferences.expected_salary_min) : null,
    expected_salary_max: preferences.expected_salary_max ? Number(preferences.expected_salary_max) : null,
    availability: preferences.availability,
    open_to_relocate: preferences.open_to_relocate,
    profile_visible: preferences.profile_visible,
  });

  const savePreferences = async () => {
    const min = Number(preferences.expected_salary_min);
    const max = Number(preferences.expected_salary_max);

    if (preferences.expected_salary_min && preferences.expected_salary_max && max < min) {
      const message = 'Maximum salary cannot be lower than the minimum.';
      setUpdateError(message);
      toast.error(message);
      return;
    }

    setSavingPreferences(true);
    setPreferencesError('');

    try {
      const updated = await apiServerClient.fetch('/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences: preferencesToRequest() }),
      });

      setProfile(updated);
      setPreferences({
        desired_roles: (updated.preferences?.desired_roles || []).join(', '),
        preferred_locations: (updated.preferences?.preferred_locations || []).join(', '),
        work_arrangement: updated.preferences?.work_arrangement || 'any',
        job_type: updated.preferences?.job_type || 'any',
        experience_level: updated.preferences?.experience_level || 'any',
        expected_salary_min: updated.preferences?.expected_salary_min ?? '',
        expected_salary_max: updated.preferences?.expected_salary_max ?? '',
        availability: updated.preferences?.availability || '',
        open_to_relocate: Boolean(updated.preferences?.open_to_relocate),
        profile_visible: updated.preferences?.profile_visible !== false,
      });
      toast.success('Job preferences saved');
    } catch (error) {
      const message = error.body?.error || error.message || 'Could not save your preferences.';
      setPreferencesError(message);
      toast.error(message);
    } finally {
      setSavingPreferences(false);
    }
  };

  // Modal States
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState(null);

  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);

  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [selectedEdu, setSelectedEdu] = useState(null);

  const calculateAndSaveStrength = useCallback(async (prof, sk, ed, ex) => {
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
  }, []);

  const getProfileName = (profileRecord) => {
    if (profileRecord?.full_name) return profileRecord.full_name;
    return [profileRecord?.firstName, profileRecord?.lastName].filter(Boolean).join(' ');
  };

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[PROFILE INIT] Fetching profile for user:', currentUser?.id);

      // Fetch profile from API
      const profileRecord = await apiServerClient.fetch('/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('[PROFILE INIT] Found existing profile:', profileRecord._id);

      setProfile(profileRecord);
      const nextFormData = {
        full_name: getProfileName(profileRecord) || '',
        bio: profileRecord.bio || '',
        location: profileRecord.location || '',
        phone: profileRecord.phone || '',
        date_of_birth: profileRecord.date_of_birth ? profileRecord.date_of_birth.split('T')[0] : '',
        gender: profileRecord.gender || '',
        nationality: profileRecord.nationality || '',
        linkedin_url: profileRecord.linkedin_url || '',
        portfolio_url: profileRecord.portfolio_url || '',
        github_url: profileRecord.github_url || ''
      };
      setFormData(nextFormData);
      setSavedFormData(nextFormData);
      setPreferences({
        desired_roles: (profileRecord.preferences?.desired_roles || []).join(', '),
        preferred_locations: (profileRecord.preferences?.preferred_locations || []).join(', '),
        work_arrangement: profileRecord.preferences?.work_arrangement || 'any',
        job_type: profileRecord.preferences?.job_type || 'any',
        experience_level: profileRecord.preferences?.experience_level || 'any',
        expected_salary_min: profileRecord.preferences?.expected_salary_min ?? '',
        expected_salary_max: profileRecord.preferences?.expected_salary_max ?? '',
        availability: profileRecord.preferences?.availability || '',
        open_to_relocate: Boolean(profileRecord.preferences?.open_to_relocate),
        profile_visible: profileRecord.preferences?.profile_visible !== false,
      });

      if (profileRecord.picture) {
        setPicPreview(`${import.meta.env.VITE_API_SERVER_URL}${profileRecord.picture}`);
      }

      // Fetch skills, education, experience from API
      const [skillsData, eduData, expData] = await Promise.all([
        apiServerClient.fetch('/profile/skills', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        apiServerClient.fetch('/profile/education', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        apiServerClient.fetch('/profile/experience', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      setSkills(skillsData);
      setEducation(eduData);
      setExperience(expData);

      // Calculate profile strength
      calculateAndSaveStrength(profileRecord, skillsData, eduData, expData);
    } catch (error) {
      console.error('[PROFILE INIT] Error:', error);
      console.log('[PROFILE INIT] No profile found, will create on save');
      setProfile(null);
      const emptyFormData = {
        full_name: currentUserName || '',
        bio: '', location: '', phone: '', date_of_birth: '', gender: '', nationality: '',
        linkedin_url: '', portfolio_url: '', github_url: ''
      };
      setFormData(emptyFormData);
      // Nothing is saved yet, so every field counts as an unsaved change.
      setSavedFormData(null);
      setSkills([]);
      setEducation([]);
      setExperience([]);
      setUpdateError(error.status === 404 ? null : 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [token, currentUser?.id, currentUserName, calculateAndSaveStrength]);

  /**
   * Load the profile once the token is known.
   *
   * This must sit *below* the `fetchProfileData` declaration above. A hook's
   * dependency array is evaluated synchronously while the component renders,
   * so referencing a `const` that has not been initialised yet throws
   * "Cannot access 'fetchProfileData' before initialization" and blanks the
   * whole page.
   */
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleProfileUpdate = async (e) => {
    if (e) e.preventDefault();
    setUpdateError(null);

    if (!formData.full_name || formData.full_name.trim() === '') {
      const errMsg = "Full Name is a required field.";
      setUpdateError(errMsg);
      toast.error(errMsg);
      return;
    }

    // Catch obvious typos before spending a round trip on them.
    const urlFields = ['linkedin_url', 'portfolio_url', 'github_url'];
    for (const field of urlFields) {
      const value = formData[field]?.trim();
      if (value && !/^https?:\/\/.+/i.test(value)) {
        const errMsg = `${field.replace(/_/g, ' ')} must start with http:// or https://`;
        setUpdateError(errMsg);
        toast.error(errMsg);
        return;
      }
    }

    setSaving(true);
    try {
      const dataToSave = { ...formData };
      if (!dataToSave.date_of_birth) {
        dataToSave.date_of_birth = null;
      }

      const updated = await apiServerClient.fetch('/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify(dataToSave)
      });

      setProfile(updated);
      // Re-sync from the server so the "unsaved changes" indicator clears
      // against what was actually persisted, not what was submitted.
      const persisted = {
        full_name: getProfileName(updated) || '',
        bio: updated.bio || '',
        location: updated.location || '',
        phone: updated.phone || '',
        date_of_birth: updated.date_of_birth ? updated.date_of_birth.split('T')[0] : '',
        gender: updated.gender || '',
        nationality: updated.nationality || '',
        linkedin_url: updated.linkedin_url || '',
        portfolio_url: updated.portfolio_url || '',
        github_url: updated.github_url || '',
      };
      setFormData(persisted);
      setSavedFormData(persisted);
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("Profile updated and saved successfully");
      // Update auth context if profile pic is present
      if (currentUser && updated.picture) {
        currentUser.profilePicture = updated.picture;
        // Dispatch event to update header
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (error) {
      // Prefer the server's message; `error.body.error` is the actionable one.
      const errorMessage = error.body?.error || error.message || "An unexpected error occurred while updating your profile.";
      setUpdateError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
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
      const updated = await apiServerClient.fetch('/profile/upload-picture', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` },
        body: formData
      });

      console.log('[PIC UPLOAD] Success! Response:', updated);
      setProfile(updated);
      if (currentUser) {
        currentUser.profilePicture = updated?.picture || null;
        window.dispatchEvent(new Event('profileUpdated'));
      }
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("Profile picture updated and saved successfully");
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
      const updated = await apiServerClient.fetch('/profile/remove-picture', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      setProfile(updated);
      setPicPreview(null);
      if (currentUser) {
        currentUser.profilePicture = null;
        window.dispatchEvent(new Event('profileUpdated'));
      }
      calculateAndSaveStrength(updated, skills, education, experience);
      toast.success("Profile picture removed and saved");
    } catch (error) {
      console.error('[PIC REMOVE] Failed:', error);
      toast.error("Failed to remove picture");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleCVDownload = async () => {
    // GET /profile/cv is behind authMiddleware, so a plain <a href> would
    // arrive without an Authorization header and always 401. Fetch it with
    // the bearer token and save the resulting blob instead.
    setDownloadingCV(true);
    try {
      const response = await fetch(`${apiServerClient.baseUrl}/profile/cv`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to download CV');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match ? match[1] : 'resume';

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success('CV downloaded');
    } catch (error) {
      console.error('CV download error:', error);
      toast.error(error.message || 'Failed to download CV');
    } finally {
      setDownloadingCV(false);
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
      const updated = await apiServerClient.fetch('/profile/upload-cv', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` },
        body: formData
      });

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
        const updated = await apiServerClient.fetch(`/profile/experience/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(dataToSave)
        });
        updatedExps = experience.map(e => e.id === data.id ? updated : e);
        toast.success("Experience updated");
      } else {
        const added = await apiServerClient.fetch('/profile/experience', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(dataToSave)
        });
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
      await apiServerClient.fetch(`/profile/experience/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

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
        const updated = await apiServerClient.fetch(`/profile/skills/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(data)
        });
        updatedSkills = skills.map(s => s.id === data.id ? updated : s);
        toast.success("Skill updated");
      } else {
        const added = await apiServerClient.fetch('/profile/skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(data)
        });
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
      await apiServerClient.fetch(`/profile/skills/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

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
        const updated = await apiServerClient.fetch(`/profile/education/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(dataToSave)
        });
        updatedEdus = education.map(e => e.id === data.id ? updated : e);
        toast.success("Education updated");
      } else {
        const added = await apiServerClient.fetch('/profile/education', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token}`
          },
          body: JSON.stringify(dataToSave)
        });
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
      await apiServerClient.fetch(`/profile/education/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

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
          {/* Let the candidate see exactly what an employer sees. */}
          {profile?.user_id && (
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <a href={`/candidate/${profile.user_id}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> View my public profile
              </a>
            </Button>
          )}
        </div>
        
        <Card className="w-full md:w-80 bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm">Profile Strength</span>
              <span className="font-bold text-primary">{strengthBreakdown.percent}%</span>
            </div>
            <Progress value={strengthBreakdown.percent} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {strengthBreakdown.percent === 100
                ? 'All set! You are ready to apply.'
                : `${strengthBreakdown.done} of ${strengthBreakdown.total} sections complete.`}
            </p>

            {/* Tell them exactly what to do next rather than just a percentage. */}
            {strengthBreakdown.missing.length > 0 && (
              <div className="mt-3 pt-3 border-t border-primary/20">
                <p className="text-xs font-semibold mb-2">Still missing</p>
                <ul className="space-y-1">
                  {strengthBreakdown.missing.slice(0, 4).map((field) => (
                    <li key={field.label} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                      {field.label}
                    </li>
                  ))}
                </ul>
                {strengthBreakdown.missing.length > 4 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{strengthBreakdown.missing.length - 4} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="py-2.5">
              {tab.label}
            </TabsTrigger>
          ))}
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

                <div className="flex justify-end pt-4 gap-3 items-center">
                  {hasUnsavedChanges && !updateError && (
                    <span className="text-sm text-amber-600 dark:text-amber-400 mr-auto flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" /> You have unsaved changes
                    </span>
                  )}
                  {updateError && (
                    <Button type="button" variant="outline" onClick={handleProfileUpdate} disabled={saving} className="mr-auto">
                      <RefreshCw className="mr-2 h-4 w-4" /> Retry
                    </Button>
                  )}
                  <Button type="submit" size="lg" disabled={saving || !hasUnsavedChanges}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* JOB PREFERENCES TAB */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Job Preferences</CardTitle>
              <CardDescription>
                Tell us what you are looking for so we can flag roles that fit and sort out the ones that do not.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preferencesError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{preferencesError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="desired_roles">Roles you are interested in</Label>
                  <Input
                    id="desired_roles"
                    placeholder="Frontend Engineer, React Developer, UI Engineer"
                    value={preferences.desired_roles}
                    onChange={(e) => setPreferences({ ...preferences, desired_roles: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Separate with commas. We use these to rank matching roles.</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="preferred_locations">Preferred locations</Label>
                  <Input
                    id="preferred_locations"
                    placeholder="London, Manchester, Remote"
                    value={preferences.preferred_locations}
                    onChange={(e) => setPreferences({ ...preferences, preferred_locations: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Work arrangement</Label>
                  <Select
                    value={preferences.work_arrangement}
                    onValueChange={(v) => setPreferences({ ...preferences, work_arrangement: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="on-site">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Employment type</Label>
                  <Select
                    value={preferences.job_type}
                    onValueChange={(v) => setPreferences({ ...preferences, job_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Experience level</Label>
                  <Select
                    value={preferences.experience_level}
                    onValueChange={(v) => setPreferences({ ...preferences, experience_level: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="entry">Entry level</SelectItem>
                      <SelectItem value="mid">Mid level</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    placeholder="Immediately, 1 month notice, 3 months"
                    value={preferences.availability}
                    onChange={(e) => setPreferences({ ...preferences, availability: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_min">Expected salary (min)</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    min="0"
                    placeholder="50000"
                    value={preferences.expected_salary_min}
                    onChange={(e) => setPreferences({ ...preferences, expected_salary_min: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_max">Expected salary (max)</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    min="0"
                    placeholder="80000"
                    value={preferences.expected_salary_max}
                    onChange={(e) => setPreferences({ ...preferences, expected_salary_max: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={preferences.open_to_relocate}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, open_to_relocate: checked === true })}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">I am open to relocating</p>
                    <p className="text-xs text-muted-foreground">We will surface roles outside your preferred locations too.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={preferences.profile_visible}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, profile_visible: checked === true })}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">My profile is visible to employers</p>
                    <p className="text-xs text-muted-foreground">Turn this off to browse without appearing in employer searches.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="lg" onClick={savePreferences} disabled={savingPreferences}>
                  {savingPreferences ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    'Save Preferences'
                  )}
                </Button>
              </div>
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
                      <Button variant="outline" onClick={handleCVDownload} disabled={downloadingCV}>
                        {downloadingCV ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Download
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
