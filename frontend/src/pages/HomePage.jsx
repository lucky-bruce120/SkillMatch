import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BrainCircuit, Target, Zap, BellRing, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1524221629551-6dd14def5ffd?q=80&w=2000&auto=format&fit=crop" 
            alt="Professionals working together" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight text-balance">
              Find Your Perfect <span className="text-primary">Job Match</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop searching, start matching. Our AI-powered platform connects your unique skills and experience with the ideal roles at top companies.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8" asChild>
                <Link to="/signup">Sign Up as Job Seeker</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8 bg-white/10 text-white border-white/20 hover:bg-white/20" asChild>
                <Link to="/jobs">Browse Open Jobs</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section (Bento Grid) */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Why choose SkillMatch?</h2>
            <p className="text-muted-foreground text-lg">We've reimagined the job search process to focus on what actually matters: your skills and potential.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="md:col-span-2 bg-primary/5 border-primary/10 shadow-none">
              <CardContent className="p-8 flex flex-col h-full justify-center">
                <BrainCircuit className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-2xl font-bold mb-3">Smart Matching Algorithm</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our proprietary AI analyzes your skills, experience, and preferences to calculate a precise match score for every job, ensuring you only see roles you're truly qualified for.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card shadow-sm">
              <CardContent className="p-8 flex flex-col h-full justify-center">
                <Target className="w-10 h-10 text-secondary mb-6" />
                <h3 className="text-xl font-bold mb-3">Comprehensive Profiles</h3>
                <p className="text-muted-foreground">Showcase your full potential beyond a standard resume with detailed skill proficiency levels.</p>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm">
              <CardContent className="p-8 flex flex-col h-full justify-center">
                <BellRing className="w-10 h-10 text-accent-foreground mb-6" />
                <h3 className="text-xl font-bold mb-3">Real-time Alerts</h3>
                <p className="text-muted-foreground">Get notified instantly when a high-matching job is posted or an employer views your profile.</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-card shadow-sm overflow-hidden relative">
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <CardContent className="p-8 flex flex-col h-full justify-center relative z-10">
                <Zap className="w-12 h-12 text-yellow-500 mb-6" />
                <h3 className="text-2xl font-bold mb-3">One-Click Applications</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Once your profile is complete, apply to matching jobs with a single click. Track all your applications in one centralized dashboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-muted/30 border-y">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg">Four simple steps to land your next great opportunity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { step: '01', title: 'Create Profile', desc: 'Sign up and detail your skills, experience, and preferences.' },
              { step: '02', title: 'Get Matched', desc: 'Our AI instantly finds jobs that align with your unique profile.' },
              { step: '03', title: 'Apply Easily', desc: 'Review your matches and apply with a single click.' },
              { step: '04', title: 'Get Hired', desc: 'Track your status and connect directly with employers.' }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-2xl bg-background shadow-sm border flex items-center justify-center text-xl font-bold text-primary mb-6 group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {i < 3 && <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Ready to find your match?</h2>
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who have already found their ideal roles through SkillMatch.
          </p>
          <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold" asChild>
            <Link to="/signup">Create Your Free Profile <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;