import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Building2, Calendar, ArrowRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useRealtime } from '@/hooks/useRealtime.js';

/**
 * The Application model stores `pending | reviewed | accepted | rejected`.
 * These are the labels and colours used for each.
 */
const STATUS_META = {
  pending: {
    label: 'Pending',
    classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: Clock,
  },
  reviewed: {
    label: 'Under Review',
    classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    icon: Clock,
  },
  accepted: {
    label: 'Accepted',
    classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: XCircle,
  },
};

const FALLBACK_STATUS = {
  label: 'Applied',
  classes: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  icon: Clock,
};

const getStatusMeta = (status) => {
  const key = String(status || 'pending').toLowerCase();
  return STATUS_META[key] || FALLBACK_STATUS;
};

const ApplicationsPage = () => {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  const getJobId = (application) =>
    application.job_id?._id || application.job_id?.id || application.job_id;

  const fetchApplications = useCallback(async () => {
    try {
      const applicationsData = await apiServerClient.fetch('/apply-job', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      setApplications(Array.isArray(applicationsData) ? applicationsData : []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    if (currentUser) fetchApplications();
  }, [currentUser, fetchApplications]);

  // A status change (accepted, rejected, reviewed) arrives over the live
  // stream, so the list updates without the candidate refreshing.
  useRealtime({
    'application:status': (payload) => {
      // `resumed` means the app came back to the foreground, so anything
      // missed while it was away is fetched fresh.
      if (payload?.resumed) {
        fetchApplications();
        return;
      }
      if (!payload?.applicationId) return;
      setApplications((current) =>
        current.map((app) =>
          (app._id || app.id) === payload.applicationId
            ? { ...app, status: payload.status, feedback: payload.feedback || app.feedback }
            : app
        )
      );
    },
    'application:created': () => {
      fetchApplications();
    },
  });

  // Accepted and rejected applications have reached the end of their life, so
  // they are kept out of the "Pending" tab but still visible under "All" and
  // "Decided".
  const pendingApplications = applications.filter((app) => {
    const status = String(app.status || 'pending').toLowerCase();
    return status === 'pending' || status === 'reviewed';
  });

  const acceptedApplications = applications.filter(
    (app) => String(app.status || '').toLowerCase() === 'accepted'
  );

  const rejectedApplications = applications.filter(
    (app) => String(app.status || '').toLowerCase() === 'rejected'
  );

  const decidedApplications = [...acceptedApplications, ...rejectedApplications];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-4">
        <Skeleton className="h-10 w-48 mb-8" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const renderList = (list, emptyMessage) => (
    list.length > 0 ? (
      <div className="space-y-4">
        {list.map((app) => {
          const meta = getStatusMeta(app.status);
          const StatusIcon = meta.icon;
          const jobId = getJobId(app);

          return (
            <Card key={app._id || app.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Briefcase className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {jobId ? (
                          <Link to={`/job/${jobId}`} className="hover:text-primary transition-colors">
                            {app.job_id?.title || 'Unknown Job'}
                          </Link>
                        ) : (
                          app.job_id?.title || 'Unknown Job'
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 size={14} /> {app.job_id?.company || 'Unknown Company'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} /> Applied: {new Date(app.applied_at).toLocaleDateString()}
                        </span>
                      </div>
                      {app.feedback && (
                        <p className="mt-2 text-sm text-muted-foreground italic">"{app.feedback}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                    <Badge variant="secondary" className={`px-3 py-1 text-sm flex items-center gap-1.5 ${meta.classes}`}>
                      <StatusIcon size={14} /> {meta.label}
                    </Badge>
                    {jobId && (
                      <Button variant="ghost" size="sm" asChild className="hidden md:flex">
                        <Link to={`/job/${jobId}`}>View Job <ArrowRight size={16} className="ml-2" /></Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
        <Briefcase className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-medium mb-2">Nothing here yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{emptyMessage}</p>
        <Button asChild size="lg">
          <Link to="/jobs">Browse Jobs</Link>
        </Button>
      </div>
    )
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">My Applications</h1>
      <p className="text-muted-foreground mb-8">
        Track where each application stands. Applications that have been accepted
        or rejected are moved out of Pending.
      </p>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1">
          <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingApplications.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({acceptedApplications.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedApplications.length})</TabsTrigger>
          <TabsTrigger value="decided">Decided ({decidedApplications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderList(applications, "You haven't applied to any jobs yet. Start browsing to find your perfect match.")}
        </TabsContent>
        <TabsContent value="pending">
          {renderList(pendingApplications, "No applications are waiting on a response right now.")}
        </TabsContent>
        <TabsContent value="accepted">
          {renderList(acceptedApplications, "No applications have been accepted yet. Keep going!")}
        </TabsContent>
        <TabsContent value="rejected">
          {renderList(rejectedApplications, "No rejected applications.")}
        </TabsContent>
        <TabsContent value="decided">
          {renderList(decidedApplications, "No applications have been decided yet.")}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApplicationsPage;
