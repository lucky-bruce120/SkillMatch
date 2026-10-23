import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Calendar, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

const INTERVIEW_TYPES = [
  { value: 'phone', label: 'Phone call' },
  { value: 'video', label: 'Video call' },
  { value: 'in-person', label: 'In person' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  title: 'Interview Invitation',
  description: '',
  type: 'video',
  date: '',
  time: '10:00',
  duration_minutes: '30',
  location: '',
  meeting_link: '',
};

/**
 * InterviewInviteDialog
 *
 * Collects everything needed to invite a candidate to an interview and sends
 * it to the API. The invitation is stored against the application, the
 * candidate is notified, and the employer is told the invite went out.
 */
const InterviewInviteDialog = ({ open, onOpenChange, applicationId, candidateName, jobTitle, onSent }) => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Reset the form each time the dialog opens so a previous invite is not
  // silently reused.
  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, title: jobTitle ? `Interview - ${jobTitle}` : 'Interview Invitation' });
      setError('');
    }
  }, [open, jobTitle]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Please give the interview a title.');
      return;
    }
    if (!form.date) {
      setError('Please pick a date for the interview.');
      return;
    }
    
    const selectedDate = new Date(form.date + (form.time ? `T${form.time}` : 'T00:00'));
    const now = new Date();
    if (selectedDate < now) {
      setError('Interview date and time cannot be in the past.');
      return;
    }
    
    if (form.type === 'in-person' && !form.location.trim()) {
      setError('Please enter the location for an in-person interview.');
      return;
    }
    if (form.type === 'video' && !form.meeting_link.trim()) {
      setError('Please add a meeting link for a video interview.');
      return;
    }

    setSending(true);
    try {
      const response = await apiServerClient.fetch('/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({
          applicationId,
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          date: form.date,
          time: form.time || undefined,
          duration_minutes: Number(form.duration_minutes) || 30,
          location: form.location.trim(),
          meeting_link: form.meeting_link.trim(),
        }),
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Could not send the invitation');
      }

      toast.success(`Interview invitation sent to ${candidateName || 'the candidate'}`);
      onOpenChange(false);
      onSent?.(response.interview);
    } catch (err) {
      console.error('Error sending interview invitation:', err);
      const message = err?.body?.error || err?.message || 'Failed to send the invitation';
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Invite to Interview
          </DialogTitle>
          <DialogDescription>
            {candidateName ? `Invite ${candidateName}` : 'Invite this candidate'}
            {jobTitle ? ` to interview for ${jobTitle}` : ''}. The candidate is notified as soon as you send it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="interview-title">Interview title *</Label>
            <Input
              id="interview-title"
              value={form.title}
              onChange={update('title')}
              placeholder="e.g. First round - Technical interview"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interview-date">Date *</Label>
              <Input 
                id="interview-date" 
                type="date" 
                min={new Date().toISOString().split('T')[0]}
                value={form.date} 
                onChange={update('date')} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-time">Time</Label>
              <Input id="interview-time" type="time" value={form.time} onChange={update('time')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interview-type">Interview type</Label>
              <Select value={form.type} onValueChange={(value) => setForm((c) => ({ ...c, type: value }))}>
                <SelectTrigger id="interview-type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-duration">Duration (minutes)</Label>
              <Input
                id="interview-duration"
                type="number"
                min="5"
                step="5"
                value={form.duration_minutes}
                onChange={update('duration_minutes')}
              />
            </div>
          </div>

          {(form.type === 'video' || form.type === 'phone') && (
            <div className="space-y-2">
              <Label htmlFor="interview-link">Meeting link {form.type === 'video' ? '*' : ''}</Label>
              <Input
                id="interview-link"
                type="url"
                value={form.meeting_link}
                onChange={update('meeting_link')}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          {form.type === 'in-person' && (
            <div className="space-y-2">
              <Label htmlFor="interview-location">Location *</Label>
              <Input
                id="interview-location"
                value={form.location}
                onChange={update('location')}
                placeholder="Company address, office, room"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="interview-description">Message / details</Label>
            <Textarea
              id="interview-description"
              value={form.description}
              onChange={update('description')}
              placeholder="What to prepare, who will be there, what to bring..."
              className="min-h-[110px]"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InterviewInviteDialog;
