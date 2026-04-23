import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const PostJobPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    required_skills: '',
    salary_min: '',
    salary_max: '',
    job_type: 'Full-time',
    remote_type: 'On-site',
    experience_level: 'Mid-level',
    status: 'published'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSubmit = {
        title: formData.title,
        company: formData.company,
        location: formData.location,
        description: formData.description,
        required_skills: formData.required_skills,
        salary_min: formData.salary_min,
        salary_max: formData.salary_max,
        job_type: formData.job_type,
        remote_type: formData.remote_type,
        experience_level: formData.experience_level,
        status: formData.status
      };

      await apiServerClient.fetch('/employer/jobs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` },
        body: JSON.stringify(dataToSubmit)
      });

      toast.success("Job posted successfully!");
      navigate('/employer/jobs');
    } catch (error) {
      console.error("Error posting job:", error);
      toast.error("Failed to post job. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container max-w-4xl">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
        <Link to="/employer/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Post a New Job</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input id="company" name="company" value={formData.company} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" name="location" value={formData.location} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="required_skills">Required Skills (comma separated)</Label>
                <Input id="required_skills" name="required_skills" value={formData.required_skills} onChange={handleChange} placeholder="e.g. React, Node.js, SQL" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_min">Minimum Salary ($)</Label>
                <Input id="salary_min" name="salary_min" type="number" value={formData.salary_min} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_max">Maximum Salary ($)</Label>
                <Input id="salary_max" name="salary_max" type="number" value={formData.salary_max} onChange={handleChange} />
              </div>
              
              <div className="space-y-2">
                <Label>Job Type *</Label>
                <Select value={formData.job_type} onValueChange={(v) => handleSelectChange('job_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Remote Type *</Label>
                <Select value={formData.remote_type} onValueChange={(v) => handleSelectChange('remote_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="On-site">On-site</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Experience Level *</Label>
                <Select value={formData.experience_level} onValueChange={(v) => handleSelectChange('experience_level', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entry-level">Entry-level</SelectItem>
                    <SelectItem value="Mid-level">Mid-level</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                required 
                className="min-h-[200px]"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/employer/jobs')}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Post Job
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostJobPage;
