import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Bell, Check, Trash2, Briefcase, MessageSquare, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const NotificationDropdown = ({ isOpen, onClose, onCountUpdate }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchNotifications();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    try {
      const result = await pb.collection('notifications').getList(1, 50, {
        filter: `user_id="${currentUser.id}"`,
        sort: 'read,-created_at',
        $autoCancel: false
      });
      setNotifications(result.items);
      onCountUpdate(result.items.filter(n => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await pb.collection('notifications').update(id, { read: true }, { $autoCancel: false });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      onCountUpdate(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      const notif = notifications.find(n => n.id === id);
      await pb.collection('notifications').delete(id, { $autoCancel: false });
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (!notif.read) {
        onCountUpdate(prev => Math.max(0, prev - 1));
      }
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getIcon = (type) => {
    switch(type) {
      case 'job_match': return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'application_update': return <Bell className="h-4 w-4 text-green-500" />;
      case 'new_message': return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'interview_invitation': return <Calendar className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-12 mt-2 w-80 sm:w-96 bg-card border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-4 border-b bg-muted/30 flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <Badge variant="secondary">{notifications.filter(n => !n.read).length} New</Badge>
          </div>
          
          <div className="px-2 pt-2 shrink-0">
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto p-1">
                <TabsTrigger value="all" className="text-xs py-1.5">All</TabsTrigger>
                <TabsTrigger value="job_match" className="text-xs py-1.5">Jobs</TabsTrigger>
                <TabsTrigger value="application_update" className="text-xs py-1.5">Apps</TabsTrigger>
                <TabsTrigger value="new_message" className="text-xs py-1.5">Msgs</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-lg flex gap-3 group transition-colors ${notif.read ? 'bg-transparent hover:bg-muted/50' : 'bg-primary/5 border border-primary/10'}`}
                >
                  <div className="mt-1 shrink-0 p-2 bg-background rounded-full shadow-sm h-8 w-8 flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notif.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notif.read && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-50" onClick={(e) => markAsRead(notif.id, e)} title="Mark as read">
                        <Check size={14} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => deleteNotification(notif.id, e)} title="Delete">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No notifications found</p>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t bg-muted/10 shrink-0">
            <Button variant="ghost" className="w-full text-sm" asChild onClick={onClose}>
              <Link to="/notifications">View All Notifications</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
