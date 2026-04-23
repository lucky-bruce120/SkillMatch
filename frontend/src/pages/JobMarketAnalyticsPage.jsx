import React, { useState, useEffect } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f43f5e', '#f97316', '#f59e0b', '#eab308'];

const JobMarketAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const result = await apiServerClient.fetch('/job-market/analytics');
        setData(result);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleExport = () => {
    // Simple CSV export logic
    if (!data) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Skill,Demand Count\n"
      + data.trending_skills.map(e => `${e.skill},${e.count}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "market_analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-center py-12">Failed to load analytics data.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Market Analytics</h1>
          <p className="text-muted-foreground mt-1">Real-time insights into industry trends and skill demands.</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Skills */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Top Trending Skills</CardTitle>
            <CardDescription>Most requested skills across all active job postings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trending_skills} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="skill" angle={-45} textAnchor="end" height={60} tick={{fontSize: 12}} />
                  <YAxis />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="count" name="Job Postings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Salary Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-secondary" /> Salary by Experience</CardTitle>
            <CardDescription>Average salary ranges across different experience levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.salary_trends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="experience_level" />
                  <YAxis tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Line type="monotone" dataKey="avg_salary" name="Avg Salary" stroke="hsl(var(--secondary))" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Job Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-accent" /> Jobs by Industry</CardTitle>
            <CardDescription>Distribution of open roles across sectors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.job_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="industry"
                  >
                    {data.job_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Skills Gap Analysis */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Skills Gap Analysis</CardTitle>
            <CardDescription>Comparing market demand vs available talent pool</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.skills_gap} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="skill" angle={-45} textAnchor="end" height={60} tick={{fontSize: 12}} />
                  <YAxis />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="in_demand_count" name="Market Demand" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="available_talent_count" name="Available Talent" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobMarketAnalyticsPage;
