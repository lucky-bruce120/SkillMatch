import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Video, MapPin, Phone, Clock } from 'lucide-react';

const STATUS_STYLES = {
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const STATUS_LABELS = {
  sent: 'Sent',
  pending: 'Sent',
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

const EmployerInterviewsPage = () => {
  const { currentUser } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInterviews = useCallback(async () => {
    try {
      const data = await apiServerClient.fetch('/interviews/employer', {
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

  if (loading) {
    return (
      <div className="dashboard-container space-y-4">
        <Skeleton className="h-12 w-64" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Interviews</h1>
          <p className="text-muted-foreground mt-1">Every interview invitation you have sent.</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No interviews yet</h3>
            <p className="text-muted-foreground mb-4">
              Open an applicant's list and use the Invite button to schedule an interview.
            </p>
            <Button asChild>
              <a href="/employer/applications">Go to Applicants</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview) => {
            const TypeIcon = TYPE_ICONS[interview.type] || Calendar;
            const status = String(interview.status || 'sent').toLowerCase();

            return (
              <Card key={interview._id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{interview.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {interview.job_id?.title || 'Interview'}
                        {interview.job_seeker_id?.email ? ` - ${interview.job_seeker_id.email}` : ''}
                      </p>
                    </div>
                    <Badge variant="secondary" className={STATUS_STYLES[status] || ''}>
                      {STATUS_LABELS[status] || status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {new Date(interview.date).toLocaleString()}
                      {interview.duration_minutes ? ` (${interview.duration_minutes} min)` : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <TypeIcon className="h-4 w-4" /> {interview.type}
                    </span>
                    {interview.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> {interview.location}
                      </span>
                    )}
                  </div>

                  {interview.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{interview.description}</p>
                  )}

                  {interview.meeting_link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-2 h-4 w-4" /> Open meeting link
                      </a>
                    </Button>
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

export default EmployerInterviewsPage;
