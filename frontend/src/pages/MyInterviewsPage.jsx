import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Video, MapPin, Phone, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/useRealtime.js';

const STATUS_STYLES = {
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const STATUS_LABELS = {
  sent: 'Invitation sent',
  pending: 'Invitation sent',
  accepted: 'Accepted',
  rejected: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const TYPE_ICONS = {
  video: Video,
  phone: Phone,
  'in-person': MapPin,
  other: Calendar,
};

const MyInterviewsPage = () => {
  const { currentUser } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchInterviews = useCallback(async () => {
    try {
      const data = await apiServerClient.fetch('/interviews/seeker', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` },
      });
      setInterviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.body?.error || 'We could not load your interviews.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    if (currentUser?.token) fetchInterviews();
  }, [currentUser?.token, fetchInterviews]);

  // A new invitation appears without the candidate refreshing.
  useRealtime({
    'interview:invited': () => fetchInterviews(),
  });

  const respond = async (interview, status) => {
    setUpdatingId(interview._id);
    try {
      await apiServerClient.fetch(`/interviews/${interview._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({ status }),
      });
      setInterviews((current) =>
        current.map((item) => (item._id === interview._id ? { ...item, status } : item))
      );
      toast.success(status === 'accepted' ? 'Interview accepted' : 'Invitation declined');
    } catch (err) {
      toast.error(err?.body?.error || 'Could not update the invitation');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <Skeleton className="h-10 w-48 mb-8" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">My Interviews</h1>
      <p className="text-muted-foreground mb-8">
        Invitations from employers and how you responded to them.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {interviews.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
          <Calendar className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">No interviews yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            When an employer invites you to an interview it will show up here.
          </p>
          <Button asChild size="lg">
            <Link to="/jobs">Browse Jobs</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview) => {
            const TypeIcon = TYPE_ICONS[interview.type] || Calendar;
            const status = String(interview.status || 'sent').toLowerCase();
            const canRespond = status === 'sent' || status === 'pending';

            return (
              <Card key={interview._id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{interview.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {interview.job_id?.title || 'Interview'}
                        {interview.job_id?.company ? ` at ${interview.job_id.company}` : ''}
                      </p>
                    </div>
                    <Badge variant="secondary" className={STATUS_STYLES[status] || ''}>
                      {STATUS_LABELS[status] || status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {new Date(interview.date).toLocaleString()}
                      {interview.duration_minutes ? ` (${interview.duration_minutes} min)` : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <TypeIcon className="h-4 w-4" />
                      {interview.type}
                    </span>
                    {interview.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> {interview.location}
                      </span>
                    )}
                  </div>

                  {interview.meeting_link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-2 h-4 w-4" /> Join meeting
                      </a>
                    </Button>
                  )}

                  {interview.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {interview.description}
                    </p>
                  )}

                  {canRespond && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        disabled={updatingId === interview._id}
                        onClick={() => respond(interview, 'accepted')}
                        className="text-green-600 hover:bg-green-50 border-green-200"
                        variant="outline"
                      >
                        <Check className="mr-1 h-4 w-4" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === interview._id}
                        onClick={() => respond(interview, 'rejected')}
                        className="text-red-600 hover:bg-red-50 border-red-200"
                      >
                        <X className="mr-1 h-4 w-4" /> Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyInterviewsPage;
