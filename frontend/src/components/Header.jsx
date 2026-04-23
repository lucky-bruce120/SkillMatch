import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Briefcase, Menu, X, Bell, ChevronDown, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import NotificationDropdown from './NotificationDropdown.jsx';

const Header = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentUser]);

  const fetchUnreadCount = async () => {
    try {
      const data = await apiServerClient.fetch('/notifications/unread-count', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

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
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                  <MessageSquare size={20} />
                </Button>
                
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
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {currentUser?.name?.charAt(0) || 'U'}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{currentUser?.name || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                        <Badge variant="secondary" className="w-fit mt-2 text-[10px]">{currentUser?.role}</Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {currentUser?.role === 'Job Seeker' && (
                      <>
                        <DropdownMenuItem asChild><Link to="/profile">Profile Settings</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/saved-jobs">Saved Jobs</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/bookmarked-courses">Saved Courses</Link></DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      Log out
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
