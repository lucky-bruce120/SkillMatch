import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Briefcase, Menu, X, Bell, ChevronDown, Settings, Heart, Bookmark, FileText, ShieldCheck, LogOut, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import NotificationDropdown from './NotificationDropdown.jsx';
import { getDisplayName } from '@/lib/displayName.js';
import { useRealtime, notifyUser, requestNotificationPermission } from '@/hooks/useRealtime.js';
import { toast } from 'sonner';

const Header = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profilePic, setProfilePic] = useState(currentUser?.profilePicture || null);

  useEffect(() => {
    setProfilePic(currentUser?.profilePicture || null);
  }, [currentUser?.profilePicture]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfilePic(currentUser?.profilePicture || null);
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [currentUser?.profilePicture]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // The browser notification API is not available everywhere (it needs a
  // secure context and is missing on some desktop browsers).
  const canUsePushNotifications =
    typeof window !== 'undefined' && 'Notification' in window && notificationPermission !== 'unsupported';

  const token = currentUser?.token;

  // There is no `name` on the User model, so derive one from the email.
  const userName = getDisplayName(null, currentUser);
  const userInitial = (userName || 'U').charAt(0).toUpperCase();

  // Each role has its own settings destination.
  const profileSettingsPath =
    currentUser?.role === 'Employer'
      ? '/employer/settings'
      : currentUser?.role === 'Admin'
        ? '/admin/users'
        : '/profile';

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await apiServerClient.fetch('/notifications/unread-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    // fetchUnreadCount is memoised on `token`, so this effect re-runs (and
    // clears the old interval) whenever the token changes. Previously the
    // interval captured the first render's token and kept 401-ing forever.
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, token, fetchUnreadCount]);

  // Live updates. The server pushes a change the moment it happens, so the
  // badge and the toast appear without the user refreshing or waiting for
  // the 30 second poll.
  //
  // Every state change creates a notification, and the server emits
  // `notification:new` for it. Pages subscribe to the domain events
  // (`application:new`, `application:status`, `interview:invited`) to refresh
  // their data. Toasting those here as well would show every change twice.
  useRealtime({
    'notification:new': (payload) => {
      // Only increment once per notification
      setUnreadCount((count) => count + 1);
      // On a phone the app is often in the background, so a system
      // notification is the only way the user finds out.
      const shown = notifyUser({
        title: payload?.title || 'New notification',
        body: payload?.message || '',
        tag: payload?.id || payload?.notificationId,
      });
      if (!shown && document.visibilityState === 'visible') {
        toast.info(payload?.title || 'New notification', {
          description: payload?.message,
        });
      }
    },
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  let navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Browse Jobs', path: '/jobs' },
  ];

  if (isAuthenticated) {
    if (currentUser?.role === 'Employer') {
      navLinks = [
        { name: 'Dashboard', path: '/employer/dashboard' },
        { name: 'Manage Jobs', path: '/employer/jobs' },
        { name: 'Applicants', path: '/employer/applications' },
        { name: 'Interviews', path: '/employer/interviews' },
      ];
    } else if (currentUser?.role === 'Admin') {
      navLinks = [
        { name: 'Dashboard', path: '/admin/dashboard' },
        { name: 'Users', path: '/admin/users' },
        { name: 'Jobs', path: '/admin/jobs' },
      ];
    } else {
      navLinks.push({ name: 'Dashboard', path: '/dashboard' });
      navLinks.push({ name: 'Applications', path: '/applications' });
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Briefcase size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">SkillMatch</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.path ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.name}
              </Link>
            ))}
            
            {isAuthenticated && currentUser?.role === 'Job Seeker' && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors outline-none">
                  Career Tools <ChevronDown size={14} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild><Link to="/cv-analyzer">AI CV Analyzer</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/skill-gap">Skill Gap Analysis</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/career-path">Career Path</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/interview-prep">Interview Prep</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/courses">Courses</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative text-muted-foreground hover:text-foreground"
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground transition-all">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                  <NotificationDropdown 
                    isOpen={isNotifOpen} 
                    onClose={() => setIsNotifOpen(false)} 
                    onCountUpdate={setUnreadCount}
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2" aria-label="Account menu">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold overflow-hidden">
                        {profilePic ? (
                          <img 
                            src={`${apiServerClient.baseUrl}${profilePic}`} 
                            alt={userName} 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          userInitial
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                            {profilePic ? (
                              <img 
                                src={`${apiServerClient.baseUrl}${profilePic}`} 
                                alt={userName} 
                                className="h-full w-full object-cover" 
                              />
                            ) : (
                              <span className="text-sm font-bold text-primary">{userInitial}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            {/* The User model has no `name`, so this used to always
                                render the literal "User". */}
                            <p className="text-sm font-medium leading-none">{userName}</p>
                            <p className="text-xs leading-none text-muted-foreground break-all">{currentUser?.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="w-fit mt-2 text-[10px]">{currentUser?.role}</Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Profile Settings is offered to every role. It used to be
                        inside a Job-Seeker-only block, so employers and admins
                        had no way into their settings at all. */}
                    <DropdownMenuItem asChild>
                      <Link to={profileSettingsPath}>
                        <Settings className="mr-2 h-4 w-4" /> Profile Settings
                      </Link>
                    </DropdownMenuItem>

                    {currentUser?.role === 'Job Seeker' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/saved-jobs">
                            <Heart className="mr-2 h-4 w-4" /> Saved Jobs
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/bookmarked-courses">
                            <Bookmark className="mr-2 h-4 w-4" /> Saved Courses
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/applications">
                            <FileText className="mr-2 h-4 w-4" /> My Applications
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/interviews">
                            <Calendar className="mr-2 h-4 w-4" /> My Interviews
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {currentUser?.role === 'Employer' && (
                      <DropdownMenuItem asChild>
                        <Link to="/employer/dashboard">
                          <Briefcase className="mr-2 h-4 w-4" /> Employer Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {currentUser?.role === 'Admin' && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin/dashboard">
                          <ShieldCheck className="mr-2 h-4 w-4" /> Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem asChild>
                      <Link to="/notifications">
                        <Bell className="mr-2 h-4 w-4" /> Notifications
                        {unreadCount > 0 && (
                          <span className="ml-auto text-xs font-semibold text-primary">{unreadCount}</span>
                        )}
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button>Sign up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            {isAuthenticated && currentUser?.role === 'Job Seeker' && (
              <>
                <div className="px-3 py-2 text-sm font-bold text-foreground uppercase tracking-wider mt-2">Career Tools</div>
                <Link to="/cv-analyzer" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>CV Analyzer</Link>
                <Link to="/skill-gap" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>Skill Gap Analysis</Link>
                <Link to="/career-path" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>Career Path</Link>
                <Link to="/interview-prep" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>Interview Prep</Link>
                <Link to="/courses" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>Courses</Link>
              </>
            )}

            {/* The mobile menu had no account section at all, so Profile
                Settings was unreachable on small screens. */}
            {isAuthenticated && (
              <>
                <div className="px-3 py-2 text-sm font-bold text-foreground uppercase tracking-wider mt-2">Account</div>
                <Link
                  to={profileSettingsPath}
                  className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile Settings
                </Link>
                <Link to="/notifications" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>
                  Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </Link>
                {currentUser?.role === 'Job Seeker' && (
                  <>
                    <Link to="/saved-jobs" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>Saved Jobs</Link>
                    <Link to="/applications" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>My Applications</Link>
                    <Link to="/interviews" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>My Interviews</Link>
                  </>
                )}
                {currentUser?.role === 'Employer' && (
                  <>
                    <Link to="/employer/applications" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>Review Applicants</Link>
                    <Link to="/employer/interviews" className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent" onClick={() => setIsMobileMenuOpen(false)}>Interviews</Link>
                  </>
                )}

                {/* On a phone the app is usually in the background, so ask for
                    permission to show a system notification when something
                    important happens. */}
                {canUsePushNotifications && notificationPermission !== 'granted' && (
                  <button
                    onClick={async () => {
                      const result = await requestNotificationPermission();
                      setNotificationPermission(result);
                      if (result === 'granted') {
                        toast.success('Notifications enabled', {
                          description: 'You will be notified even when the app is closed.',
                        });
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-primary hover:bg-accent"
                  >
                    Enable notifications
                  </button>
                )}
              </>
            )}

            {isAuthenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-destructive hover:bg-accent mt-4"
              >
                Log out
              </button>
            ) : (
              <div className="mt-4 flex flex-col gap-2 px-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Log in</Button>
                </Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
