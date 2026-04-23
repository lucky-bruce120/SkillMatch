import React, { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Trash2, Save } from 'lucide-react';

const SkillsModal = ({ isOpen, onClose, skill, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    skill_name: '', proficiency_level: 'Intermediate'
  });

  useEffect(() => {
    if (skill) {
      setFormData(skill);
    } else {
      setFormData({ skill_name: '', proficiency_level: 'Intermediate' });
    }
  }, [skill, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={skill?.id ? "Edit Skill" : "Add Skill"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Skill Name *</Label>
          <Input required placeholder="e.g. React, Python" value={formData.skill_name} onChange={e => setFormData({...formData, skill_name: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Proficiency Level *</Label>
          <Select value={formData.proficiency_level} onValueChange={v => setFormData({...formData, proficiency_level: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
              <SelectItem value="Expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between pt-4 border-t mt-6">
          {skill?.id ? (
            <Button type="button" variant="destructive" onClick={() => onDelete(skill.id)}>
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

export default SkillsModal;