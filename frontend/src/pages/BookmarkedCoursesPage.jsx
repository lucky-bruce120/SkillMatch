import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Clock, ExternalLink, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const BookmarkedCoursesPage = () => {
  const { currentUser } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, [currentUser]);

  const fetchBookmarks = async () => {
    try {
      // Fetch bookmarks
      const response = await apiServerClient.fetch('/bookmarked-courses', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });

      if (response.ok) {
        const bookmarks = await response.json();
        setBookmarks(bookmarks);
      } else {
        toast.error("Failed to load saved courses");
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      toast.error("Failed to load saved courses");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (courseId, bookmarkId) => {
    try {
      await apiServerClient.fetch(`/courses/bookmark/${courseId}`, { method: 'DELETE' });
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
      toast.success("Course removed from bookmarks");
    } catch (error) {
      toast.error("Failed to remove bookmark");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Saved Courses</h1>

      {bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map(bookmark => {
            const course = bookmark.course_id;
            if (!course) return null;

            return (
              <Card key={bookmark._id} className="flex flex-col h-full transition-all hover:shadow-md group">
                <div className="h-32 bg-muted/50 flex items-center justify-center border-b relative overflow-hidden">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      {course.provider}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5 flex-grow">
                  <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      {course.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{course.category}</Badge>
                    <Badge variant="outline" className={
                      course.difficulty_level === 'Beginner' ? 'border-green-200 text-green-700 bg-green-50' :
                      course.difficulty_level === 'Intermediate' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                      'border-purple-200 text-purple-700 bg-purple-50'
                    }>
                      {course.difficulty_level}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="p-5 pt-0 mt-auto flex gap-3">
                  <Button className="flex-1" asChild>
                    <a href={course.course_url || '#'} target="_blank" rel="noreferrer">
                      View Course <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleRemove(course.id, bookmark.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                    title="Remove bookmark"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
          <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">No saved courses</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">You haven't bookmarked any courses yet. Explore recommendations to find courses that match your skill gaps.</p>
          <Button asChild size="lg">
            <Link to="/course-recommendations">Find Courses</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookmarkedCoursesPage;
