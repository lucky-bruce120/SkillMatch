import React, { useState, useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Briefcase, MessageSquare, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const NotificationsPage = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const response = await apiServerClient.fetch('/notifications');
      setNotifications(response);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await apiServerClient.fetch(`/notifications/${id}/read`, {
        method: 'PUT'
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Error marking read:", error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await apiServerClient.fetch(`/notifications/${id}`, {
        method: 'DELETE'
      });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'job_match': return <Briefcase className="text-primary" size={20} />;
      case 'application_update': return <Bell className="text-secondary" size={20} />;
      case 'new_message': return <MessageSquare className="text-accent-foreground" size={20} />;
      default: return <Bell className="text-muted-foreground" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48 mb-8" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card key={notif.id} className={`transition-colors ${!notif.read ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-full ${!notif.read ? 'bg-background shadow-sm' : 'bg-muted'}`}>
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1">
                  <p className={`text-sm md:text-base ${!notif.read ? 'font-medium' : 'text-muted-foreground'}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!notif.read && (
                    <Button variant="ghost" size="icon" onClick={() => markAsRead(notif.id)} title="Mark as read">
                      <Check size={18} className="text-muted-foreground" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteNotification(notif.id)} className="text-destructive hover:bg-destructive/10" title="Delete">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
