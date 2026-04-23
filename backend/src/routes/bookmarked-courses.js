import express from 'express';
import BookmarkedCourse from '../models/BookmarkedCourse.js';
import authMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /bookmarked-courses
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const bookmarks = await BookmarkedCourse.find({ user_id: userId })
      .populate('course_id')
      .sort({ created: -1 });

    // Transform to match expected format
    const formattedBookmarks = bookmarks.map(bookmark => ({
      id: bookmark._id,
      course_id: bookmark.course_id._id,
      user_id: bookmark.user_id,
      created: bookmark.created,
      course: bookmark.course_id // Include populated course data
    }));

    res.json(formattedBookmarks);
  } catch (error) {
    logger.error('Get bookmarked courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /bookmarked-courses
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { course_id } = req.body;
    const userId = req.userId;

    // Check if already bookmarked
    const existing = await BookmarkedCourse.findOne({
      user_id: userId,
      course_id: course_id
    });

    if (existing) {
      return res.status(400).json({ error: 'Course already bookmarked' });
    }

    const bookmark = new BookmarkedCourse({
      user_id: userId,
      course_id: course_id
    });

    await bookmark.save();

    res.status(201).json({
      success: true,
      bookmarked_at: bookmark.created,
    });
  } catch (error) {
    logger.error('Bookmark course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /bookmarked-courses/:courseId
router.delete('/:courseId', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    const bookmark = await BookmarkedCourse.findOneAndDelete({
      user_id: userId,
      course_id: courseId
    });

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete bookmark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;