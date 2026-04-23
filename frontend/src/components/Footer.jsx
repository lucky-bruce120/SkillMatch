import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Globe, GitBranch, AtSign } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="site-footer border-t bg-muted/40">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Briefcase size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">SkillMatch</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              AI-powered job matching platform connecting top talent with their ideal roles based on skills and experience.
            </p>
            <div className="social-links flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <AtSign size={20} />
                <span className="sr-only">Email</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Globe size={20} />
                <span className="sr-only">Website</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <GitBranch size={20} />
                <span className="sr-only">GitHub</span>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">For Job Seekers</h3>
            <ul className="space-y-2">
              <li><Link to="/jobs" className="text-sm text-muted-foreground hover:text-primary transition-colors">Browse Jobs</Link></li>
              <li><Link to="/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">Create Profile</Link></li>
              <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">For Employers</h3>
            <ul className="space-y-2">
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Post a Job</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Search Resumes</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SkillMatch Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;