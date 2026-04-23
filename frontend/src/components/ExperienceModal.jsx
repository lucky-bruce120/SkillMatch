import React, { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Trash2, Save } from 'lucide-react';

const ExperienceModal = ({ isOpen, onClose, experience, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    job_title: '', company: '', employment_type: 'Full-time', start_date: '', end_date: '', currently_working: false, description: ''
  });

  useEffect(() => {
    if (experience) {
      setFormData({
        ...experience,
        start_date: experience.start_date ? experience.start_date.split('T')[0] : '',
        end_date: experience.end_date ? experience.end_date.split('T')[0] : '',
      });
    } else {
      setFormData({ job_title: '', company: '', employment_type: 'Full-time', start_date: '', end_date: '', currently_working: false, description: '' });
    }
  }, [experience, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={experience?.id ? "Edit Experience" : "Add Experience"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Job Title *</Label>
            <Input required value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Company *</Label>
            <Input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Employment Type</Label>
            <Select value={formData.employment_type} onValueChange={v => setFormData({...formData, employment_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex items-center gap-2 pt-8">
            <Switch id="current" checked={formData.currently_working} onCheckedChange={c => setFormData({...formData, currently_working: c})} />
            <Label htmlFor="current">I currently work here</Label>
          </div>
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
          </div>
          {!formData.currently_working && (
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
        </div>
        <div className="flex justify-between pt-4 border-t mt-6">
          {experience?.id ? (
            <Button type="button" variant="destructive" onClick={() => onDelete(experience.id)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          ) : <div></div>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit"><Save className="w-4 h-4 mr-2" /> Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ExperienceModal;