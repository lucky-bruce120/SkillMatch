import React, { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Trash2, Save } from 'lucide-react';

const EducationModal = ({ isOpen, onClose, education, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    school: '', degree: '', field_of_study: '', start_date: '', end_date: '', grade: '', activities: '', description: '', graduation_year: new Date().getFullYear()
  });

  useEffect(() => {
    if (education) {
      setFormData({
        ...education,
        start_date: education.start_date ? education.start_date.split('T')[0] : '',
        end_date: education.end_date ? education.end_date.split('T')[0] : '',
      });
    } else {
      setFormData({ school: '', degree: '', field_of_study: '', start_date: '', end_date: '', grade: '', activities: '', description: '', graduation_year: new Date().getFullYear() });
    }
  }, [education, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={education?.id ? "Edit Education" : "Add Education"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>School / University *</Label>
            <Input required value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Degree *</Label>
            <Input required value={formData.degree} onChange={e => setFormData({...formData, degree: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Field of Study *</Label>
            <Input required value={formData.field_of_study} onChange={e => setFormData({...formData, field_of_study: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>End Date (or expected)</Label>
            <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Grade / GPA</Label>
            <Input value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Activities and Societies</Label>
            <Textarea rows={2} value={formData.activities} onChange={e => setFormData({...formData, activities: e.target.value})} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
        </div>
        <div className="flex justify-between pt-4 border-t mt-6">
          {education?.id ? (
            <Button type="button" variant="destructive" onClick={() => onDelete(education.id)}>
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

export default EducationModal;