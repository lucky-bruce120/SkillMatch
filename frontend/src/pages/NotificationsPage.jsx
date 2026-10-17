import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge.jsx';
import { Bell, Briefcase, MessageSquare, Check, Trash2, CheckCheck, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

/**
 * The API returns raw Mongoose documents, so the fields are `_id`, `isRead` and
 * `created`. This page previously read `id`, `read` and `created_at`, which
 * meant every notification rendered as unread and with an "Invalid Date",
 * and the unread count in the header never matched this page.
 */
const getNotificationId = (notification) => notification._id || notification.id;

const getIsRead = (notification) => Boolean(notification.isRead ?? notification.read);

const getTimestamp = (notification) => notification.created || notification.created_at;

const timeAgo = (value) => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
};

// The real Notification.type values are new_job_match, application_response,
// course_available and message. The old switch listed types that never existed.
const TYPE_CONFIG = {
  new_job_match: { icon: Briefcase, className: 'text-primary', label: 'Job match' },
  application_response: { icon: Check, className: 'text-secondary', label: 'Application' },
  course_available: { icon: GraduationCap, className: 'text-emerald-500', label: 'Course' },
  message: { icon: MessageSquare, className: 'text-accent-foreground', label: 'Message' },
};

const NotificationsPage = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiServerClient.fetch('/notifications');
      setNotifications(Array.isArray(response) ? response : []);
    } catch (error) {
      toast.error(error.body?.error || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) fetchNotifications();
  }, [currentUser, fetchNotifications]);

  const markAsRead = async (notification) => {
    const id = getNotificationId(notification);
    if (!id) return;

    setBusyId(id);
    try {
      await apiServerClient.fetch(`/notifications/${id}/read`, { method: 'PUT' });
      // Update the real field, not a `read` field nothing reads.
      setNotifications((current) =>
        current.map((item) =>
          getNotificationId(item) === id ? { ...item, isRead: true } : item
        )
      );
    } catch (error) {
      toast.error(error.body?.error || 'Could not mark as read');
    } finally {
      setBusyId(null);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((notification) => !getIsRead(notification));
    if (unread.length === 0) return;

    setBusyId('all');
    try {
      await Promise.all(
        unread.map((notification) => {
          const id = getNotificationId(notification);
          return apiServerClient.fetch(`/notifications/${id}/read`, { method: 'PUT' });
        })
      );
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Some notifications could not be marked as read');
      fetchNotifications();
    } finally {
      setBusyId(null);
    }
  };

  const deleteNotification = async (notification) => {
    const id = getNotificationId(notification);
    if (!id) return;

    setBusyId(id);
    try {
      await apiServerClient.fetch(`/notifications/${id}`, { method: 'DELETE' });
      setNotifications((current) => current.filter((item) => getNotificationId(item) !== id));
    } catch (error) {
      toast.error(error.body?.error || 'Could not delete notification');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48 mb-8" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  const unreadCount = notifications.filter((notification) => !getIsRead(notification)).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={busyId === 'all'}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const id = getNotificationId(notification);
            const isRead = getIsRead(notification);
            const timestamp = getTimestamp(notification);
            const config = TYPE_CONFIG[notification.type] || {
              icon: Bell,
              className: 'text-muted-foreground',
              label: 'Update',
            };
            const Icon = config.icon;

            return (
              <Card
                key={id}
                className={`transition-colors ${!isRead ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`mt-1 p-2 rounded-full ${!isRead ? 'bg-background shadow-sm' : 'bg-muted'}`}>
                    <Icon className={config.className} size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {config.label}
                      </Badge>
                      {!isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>

                    {notification.title && (
                      <p className={`text-sm mt-1.5 ${!isRead ? 'font-medium' : ''}`}>
                        {notification.title}
                      </p>
                    )}
                    {notification.message && (
                      <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                    )}

                    {timestamp && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {timeAgo(timestamp)} &middot; {new Date(timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {!isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification)}
                        disabled={busyId === id}
                        title="Mark as read"
                      >
                        <Check size={18} className="text-muted-foreground" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNotification(notification)}
                      disabled={busyId === id}
                      className="text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
          <Bell className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">All caught up!</h3>
          <p className="text-muted-foreground">You don't have any new notifications right now.</p>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
