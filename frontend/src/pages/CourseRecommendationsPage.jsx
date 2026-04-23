import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Clock, ExternalLink, Bookmark, BookmarkCheck, BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CourseRecommendationsPage = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const skillGaps = searchParams.get('skills') || '';
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  
  const [filters, setFilters] = useState({
    difficulty: 'all',
    category: 'all',
    search: ''
  });

  useEffect(() => {
    fetchCourses();
    if (currentUser) fetchBookmarks();
  }, [currentUser]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const result = await pb.collection('courses').getList(1, 50, {
        sort: '-rating',
        $autoCancel: false
      });
      
      // Simple client-side relevance sorting if skills provided
      let fetchedCourses = result.items;
      if (skillGaps) {
        const targetSkills = skillGaps.toLowerCase().split(',');
        fetchedCourses = fetchedCourses.map(course => {
          let score = 0;
          const desc = (course.description || '').toLowerCase();
          const title = (course.title || '').toLowerCase();
          targetSkills.forEach(skill => {
            if (title.includes(skill.trim())) score += 2;
            if (desc.includes(skill.trim())) score += 1;
          });
          return { ...course, relevanceScore: score };
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
      }
      
      setCourses(fetchedCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const bookmarks = await pb.collection('bookmarked_courses').getFullList({
        filter: `user_id="${currentUser.id}"`,
        $autoCancel: false
      });
      setBookmarkedIds(new Set(bookmarks.map(b => b.course_id)));
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }
  };

  const toggleBookmark = async (courseId) => {
    if (!currentUser) {
      toast.error("Please log in to bookmark courses");
      return;
    }

    try {
      if (bookmarkedIds.has(courseId)) {
        const bookmark = await pb.collection('bookmarked_courses').getFirstListItem(`user_id="${currentUser.id}" && course_id="${courseId}"`, { $autoCancel: false });
        await pb.collection('bookmarked_courses').delete(bookmark.id, { $autoCancel: false });
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.delete(courseId);
          return next;
        });
        toast.success("Removed from bookmarks");
      } else {
        await pb.collection('bookmarked_courses').create({
          user_id: currentUser.id,
          course_id: courseId
        }, { $autoCancel: false });
        setBookmarkedIds(prev => new Set(prev).add(courseId));
        toast.success("Course bookmarked");
      }
    } catch (error) {
      toast.error("Failed to update bookmark");
    }
  };

  const filteredCourses = courses.filter(c => {
    if (filters.category !== 'all' && c.category !== filters.category) return false;
    if (filters.difficulty !== 'all' && c.difficulty_level !== filters.difficulty) return false;
    if (filters.search && !c.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Recommendations</h1>
          <p className="text-muted-foreground mt-1">
            {skillGaps ? `Personalized recommendations to help you learn: ${skillGaps.split(',').join(', ')}` : 'Upskill and advance your career with top-rated courses.'}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search courses..." 
            className="pl-9 bg-background"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>
        <Select value={filters.category} onValueChange={(v) => setFilters({...filters, category: v})}>
          <SelectTrigger className="w-full md:w-[200px] bg-background">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Programming">Programming</SelectItem>
            <SelectItem value="Data Science">Data Science</SelectItem>
            <SelectItem value="Business">Business</SelectItem>
            <SelectItem value="Design">Design</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.difficulty} onValueChange={(v) => setFilters({...filters, difficulty: v})}>
          <SelectTrigger className="w-full md:w-[200px] bg-background">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Beginner">Beginner</SelectItem>
            <SelectItem value="Intermediate">Intermediate</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <Card key={course.id} className="flex flex-col h-full transition-all hover:shadow-lg hover:-translate-y-1 group border-muted/60">
              <div className="h-36 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border-b relative overflow-hidden">
                <BookOpen className="h-16 w-16 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm">
                    {course.provider}
                  </Badge>
                </div>
                {course.relevanceScore > 0 && (
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-green-500 hover:bg-green-600">Highly Relevant</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-6 flex-grow">
                <h3 className="font-bold text-lg line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {course.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {course.duration}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="bg-muted/50">{course.category}</Badge>
                  <Badge variant="outline" className={
                    course.difficulty_level === 'Beginner' ? 'border-green-200 text-green-700 bg-green-50' :
                    course.difficulty_level === 'Intermediate' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                    'border-purple-200 text-purple-700 bg-purple-50'
                  }>
                    {course.difficulty_level}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
              </CardContent>
              <CardFooter className="p-6 pt-0 mt-auto flex gap-3">
                <Button className="flex-1" asChild>
                  <a href={course.course_url || '#'} target="_blank" rel="noreferrer">
                    Enroll Now <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => toggleBookmark(course.id)}
                  className={bookmarkedIds.has(course.id) ? "text-primary border-primary bg-primary/5" : ""}
                >
                  {bookmarkedIds.has(course.id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
          <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">No courses found</h3>
          <p className="text-muted-foreground mb-6">Try adjusting your filters to see more results.</p>
          <Button variant="outline" onClick={() => setFilters({ difficulty: 'all', category: 'all', search: '' })}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default CourseRecommendationsPage;
