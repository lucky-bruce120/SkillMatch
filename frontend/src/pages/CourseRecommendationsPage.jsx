import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import {
  Search, Star, Clock, Bookmark, BookmarkCheck, ExternalLink,
  GraduationCap, ArrowUpRight, AlertTriangle,
} from 'lucide-react';

const DIFFICULTY_STYLES = {
  beginner: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  advanced: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
};

const CourseRecommendationsPage = () => {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const token = currentUser?.token;

  // The skill gaps arrive as `?skills=react,kubernetes` from the CV analyser
  // and the skill-gap page.
  const skillGaps = searchParams.get('skills') || '';

  // This MUST be memoised. Building the array inline gave it a new identity on
  // every render, which made `fetchCourses` change identity, which re-ran the
  // effect, which set state, which rendered again - an endless fetch loop
  // that pinned the CPU and eventually froze the tab (worst on phones).
  const gapList = useMemo(
    () => skillGaps.split(',').map((skill) => skill.trim()).filter(Boolean),
    [skillGaps]
  );

  const [courses, setCourses] = useState([]);
  const [uncoveredSkills, setUncoveredSkills] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [facets, setFacets] = useState({ categories: [], difficulties: [] });
  const [filters, setFilters] = useState({ category: 'all', difficulty: 'all', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Note: no `skill_gaps` param at all when there are no gaps. The old code
      // sent the literal string "general", which matched no course and rendered
      // a permanently empty page.
      const params = new URLSearchParams();
      if (gapList.length) params.set('skill_gaps', gapList.join(','));
      if (filters.difficulty !== 'all') params.set('difficulty_level', filters.difficulty);

      const query = params.toString();
      const result = await apiServerClient.fetch(
        `/courses/recommendations${query ? `?${query}` : ''}`
      );

      setCourses(Array.isArray(result?.courses) ? result.courses : []);
      setUncoveredSkills(Array.isArray(result?.uncoveredSkills) ? result.uncoveredSkills : []);
    } catch (err) {
      setError(err.body?.error || 'We could not load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [gapList, filters.difficulty]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Filter options come from the API so the dropdown cannot offer a category
  // that filters every course away.
  useEffect(() => {
    apiServerClient
      .fetch('/courses/categories')
      .then((result) => setFacets({
        categories: Array.isArray(result?.categories) ? result.categories : [],
        difficulties: Array.isArray(result?.difficulties) ? result.difficulties : []
      }))
      .catch(() => setFacets({ categories: [], difficulties: [] }));
  }, []);

  const fetchBookmarks = useCallback(async () => {
    if (!token) return;
    try {
      const bookmarks = await apiServerClient.fetch('/bookmarked-courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(bookmarks) ? bookmarks : [];
      setBookmarkedIds(new Set(list.map((bookmark) => String(bookmark.course_id))));
    } catch {
      // Bookmarks are a nice-to-have; a failure should not break the page.
    }
  }, [token]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const toggleBookmark = async (courseId) => {
    if (!token) {
      toast.error('Sign in to save courses');
      return;
    }

    const key = String(courseId);
    const wasBookmarked = bookmarkedIds.has(key);

    // Optimistic, rolled back on failure.
    setBookmarkedIds((current) => {
      const next = new Set(current);
      if (wasBookmarked) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      if (wasBookmarked) {
        await apiServerClient.fetch(`/bookmarked-courses/${courseId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Bookmark removed');
      } else {
        await apiServerClient.fetch('/bookmarked-courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ course_id: courseId }),
        });
        toast.success('Course bookmarked');
      }
    } catch (error) {
      setBookmarkedIds((current) => {
        const next = new Set(current);
        if (wasBookmarked) next.add(key);
        else next.delete(key);
        return next;
      });
      toast.error(error.body?.error || 'Failed to update bookmark');
    }
  };

  const visibleCourses = courses.filter((course) => {
    if (filters.category !== 'all' && course.category !== filters.category) return false;
    if (filters.search) {
      // Coerce before toLowerCase: on some devices/cached payloads a course
      // field can arrive missing, and the unguarded call crashed the page.
      const title = String(course.title || '').toLowerCase();
      if (!title.includes(filters.search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Course Recommendations</h1>
        <p className="text-muted-foreground mt-1">
          {gapList.length
            ? `Courses picked to close your gaps: ${gapList.join(', ')}`
            : 'Browse the full catalogue, or come here from the CV analyser to fill a specific gap.'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Be honest when the catalogue cannot cover every gap. */}
      {uncoveredSkills.length > 0 && !loading && (
        <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            We have no course covering {uncoveredSkills.join(', ')} yet. Try searching for it below.
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card border rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-9 bg-background"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
          <SelectTrigger className="w-full md:w-[220px] bg-background">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {facets.categories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.difficulty} onValueChange={(value) => setFilters({ ...filters, difficulty: value })}>
          <SelectTrigger className="w-full md:w-[220px] bg-background">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {facets.difficulties.map((level) => {
              const label = String(level || '');
              return (
                <SelectItem key={label} value={label} className="capitalize">
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      ) : visibleCourses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium mb-2">No courses found</p>
            <p className="text-sm text-muted-foreground mb-6">
              {filters.search || filters.category !== 'all'
                ? 'Try clearing the filters or searching for something else.'
                : 'The course catalogue is empty. Run "npm run seed:content" in the backend to load it.'}
            </p>
            <Button variant="outline" asChild>
              <Link to="/skill-gap">Find your skill gaps</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Showing {visibleCourses.length} course{visibleCourses.length === 1 ? '' : 's'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCourses.map((course) => {
              const isBookmarked = bookmarkedIds.has(String(course.id));

              return (
                <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge variant="secondary">{course.category}</Badge>
                      {course.relevance > 0 && (
                        <Badge className="bg-primary text-primary-foreground">Highly relevant</Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold leading-snug mb-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{course.description}</p>

                    {course.matchedSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {course.matchedSkills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-[10px] border-primary/30 text-primary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      {course.provider && <span className="font-medium text-foreground">{course.provider}</span>}

                      {/* rating and duration only render when the catalogue has them */}
                      {course.rating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {course.rating}
                        </span>
                      )}
                      {course.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {course.duration}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t">
                      <Badge variant="outline" className={DIFFICULTY_STYLES[course.difficulty_level] || ''}>
                        {course.difficulty_level}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleBookmark(course.id)}
                          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark course'}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>

                        {course.url ? (
                          <Button variant="outline" size="sm" asChild>
                            <a href={course.url} target="_blank" rel="noopener noreferrer">
                              View <ExternalLink className="ml-2 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No link provided</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link to="/bookmarked-courses">
                <Bookmark className="mr-2 h-4 w-4" /> Your saved courses <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/career-path">See what to learn next</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CourseRecommendationsPage;
