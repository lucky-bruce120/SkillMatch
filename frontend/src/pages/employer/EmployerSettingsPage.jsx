import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { AlertCircle, Briefcase, Building2, Loader2, Save } from 'lucide-react';

const COMPANY_SIZES = ['Just me', '2-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing',
  'Media & Entertainment', 'Consulting', 'Non-profit', 'Other',
];

const EMPTY_FORM = {
  company_name: '',
  company_description: '',
  company_website: '',
  company_size: '',
  industry: '',
  location: '',
  contact_email: '',
  contact_phone: '',
  hiring_contact: '',
};

/**
 * Employer profile settings.
 *
 * The `EmployerProfile` model existed and was read when creating notifications,
 * but there was no endpoint or page to edit it, so employers could never fill
 * in their company details. This page and the matching `/employer/profile`
 * endpoints close that gap.
 */
const EmployerSettingsPage = () => {
  const { currentUser } = useAuth();
  const token = currentUser?.token;

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [savedFormData, setSavedFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const profile = await apiServerClient.fetch('/employer/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const next = {
        company_name: profile.company_name || '',
        company_description: profile.company_description || '',
        company_website: profile.company_website || '',
        company_size: profile.company_size || '',
        industry: profile.industry || '',
        location: profile.location || '',
        // Default the contact email to the account email on first load.
        contact_email: profile.contact_email || currentUser?.email || '',
        contact_phone: profile.contact_phone || '',
        hiring_contact: profile.hiring_contact || '',
      };

      setFormData(next);
      setSavedFormData(next);
    } catch (err) {
      setError(err.body?.error || 'Could not load your company profile.');
    } finally {
      setLoading(false);
    }
  }, [token, currentUser?.email]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const hasUnsavedChanges =
    savedFormData !== null && JSON.stringify(formData) !== JSON.stringify(savedFormData);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Company name is what candidates see on every listing, so require it.
    if (!formData.company_name.trim()) {
      const message = 'Company name is required.';
      setError(message);
      toast.error(message);
      return;
    }

    if (formData.company_website && !/^https?:\/\/.+/i.test(formData.company_website.trim())) {
      const message = 'Website must start with http:// or https://';
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    try {
      const updated = await apiServerClient.fetch('/employer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const persisted = {
        company_name: updated.company_name || '',
        company_description: updated.company_description || '',
        company_website: updated.company_website || '',
        company_size: updated.company_size || '',
        industry: updated.industry || '',
        location: updated.location || '',
        contact_email: updated.contact_email || '',
        contact_phone: updated.contact_phone || '',
        hiring_contact: updated.hiring_contact || '',
      };

      setFormData(persisted);
      setSavedFormData(persisted);
      toast.success('Company profile updated');
    } catch (err) {
      const message = err.body?.error || err.message || 'Could not save your company profile.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
          <p className="text-muted-foreground">
            This appears on every job you post and in messages to candidates.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>
            A complete profile measurably improves how many candidates apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_description">About the company</Label>
              <Textarea
                id="company_description"
                rows={5}
                placeholder="What your company does, who your customers are, and what it is like to work here."
                value={formData.company_description}
                onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(v) => setFormData({ ...formData, industry: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select an industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Company size</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(v) => setFormData({ ...formData, company_size: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select a size" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>{size} employees</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, Country or Remote"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_website">Website</Label>
                <Input
                  id="company_website"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.company_website}
                  onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="hiring_contact">Hiring contact</Label>
                <Input
                  id="hiring_contact"
                  placeholder="e.g. Head of Talent"
                  value={formData.hiring_contact}
                  onChange={(e) => setFormData({ ...formData, hiring_contact: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="talent@example.com"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact phone</Label>
                <Input
                  id="contact_phone"
                  placeholder="Optional"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-4 border-t">
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-600 dark:text-amber-400 mr-auto flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> You have unsaved changes
                </span>
              )}
              <Button type="submit" size="lg" disabled={saving || !hasUnsavedChanges}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 mt-8">
        <Button variant="outline" asChild>
          <Link to="/employer/jobs/new">
            <Briefcase className="mr-2 h-4 w-4" /> Post a job
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/employer/applications">Review applicants</Link>
        </Button>
      </div>
    </div>
  );
};

export default EmployerSettingsPage;
